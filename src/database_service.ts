'use strict'

import * as vscode from 'vscode'
import { NamespaceNode, TypeNode, ObjectNode, SqlStatement, SqlResult, ConnectionData } from './models';
import { DriverConfig, DatabaseMetadata, DataSource, Connection, Result } from 'jdbcode-api'
import { SqlParser } from './sql_parser'
import { DataSourceProvider } from 'jdbcode-api';

interface StatementData {
    sql: SqlStatement
    connection: Connection
    cursor: Result
    result: SqlResult
}

export class DatabaseService {

    private outputChannel: vscode.OutputChannel
    private debug: boolean
    private nsNodes: NamespaceNode []
    /* Map objects by name for convenience */
    private objectMap: Map<string, ObjectNode[]> = new Map()
    private currentConnection?: ConnectionData
    private dataSource: DataSource
    private statements = new Map<string, StatementData>()
    private parser = new SqlParser()

    constructor(channel: vscode.OutputChannel, debug: boolean) {
        this.outputChannel = channel
        this.debug = debug
    }

    /**
     * Set debug on or off
     */
    setDebug(debug: boolean) {
        this.debug = debug;
    }

    /**
     * The current connection configuration, null if no current connection
     */
    getConnection() : ConnectionData {
        return this.currentConnection
    }

    /**
     * Open a connection with given connection and driver config
     */
    public async connect(connection: ConnectionData, provider: DataSourceProvider) {
        let driverConfig = <DriverConfig>{
            host: connection.host,
            port: connection.port,
            username: connection.username,
            password: connection.password,
            database: connection.database
            // TODO: vendorConfig
        }
        this.dataSource = provider.createDataSource(driverConfig)
        let metaData = await this.dataSource.metaData()
        this.currentConnection = connection
        this.mapSchemaNodes(metaData)
    }

    /**
     * Refresh the current connection getting new schema data etc
     */
    public async refresh() {
        let metaData = await this.dataSource.metaData()
        this.mapSchemaNodes(metaData)
    }

    /**
     * Turn the ConnectionResult into SchemaNodes
     * @param data
     */
    private mapSchemaNodes(data: DatabaseMetadata) {
        this.objectMap.clear()
        let excludes = this.currentConnection.excludes ? this.currentConnection.excludes : []
        let includes = this.currentConnection.includes ? this.currentConnection.includes : []
        // Create the nodes, filtering by exludes and includes and sorting
        this.nsNodes = data.namespaces
            .filter(nsNode => !excludes.find(e => nsNode.name.startsWith(e)))
            .filter(nsNode => !includes.length || includes.find(i => nsNode.name.startsWith(i)))
            .map((ns) => {
                let nsNode = new NamespaceNode(ns)
                if (ns.tables.length) nsNode.typeNodes.push(new TypeNode("table", ns.tables))
                if (ns.views.length) nsNode.typeNodes.push(new TypeNode("view", ns.views))
                if (ns.procedures.length) nsNode.typeNodes.push(new TypeNode("procedure", ns.procedures))
                if (ns.synonyms.length) nsNode.typeNodes.push(new TypeNode("synonym", ns.synonyms))
                if (ns.sequences.length) nsNode.typeNodes.push(new TypeNode("sequence", ns.sequences))
                if (ns.others.length) nsNode.typeNodes.push(new TypeNode("other", ns.others))
                return nsNode
            })
            .filter(nsNode => nsNode.typeNodes.length > 0)
            .sort((ns1,ns2) => ns1.data.name.localeCompare(ns2.data.name))
        // Populate map of name -> object[]
        this.nsNodes.forEach(ns => {
            ns.typeNodes.forEach(tn => {
                tn.objectNodes.forEach(on => {
                    if (this.objectMap.has(on.object.name)) this.objectMap.get(on.object.name).push(on)
                    else this.objectMap.set(on.object.name, [on])
                })
            })
        })
    }

    /**
     * Disconnect the current connection
     */
    public async disconnect() {
        if (!this.currentConnection) return
        for (const id of this.statements.keys()) await this.close(id)
        this.logCall("disconnect", "dataSource.close", true)
        await this.dataSource.close()
        this.logCall("disconnect", "dataSource.close", false)
        this.dataSource = undefined
        this.currentConnection = undefined
        this.objectMap.clear()
        this.nsNodes = []
    }

    /**
     * Find the given db object and describe it
     * @param namespace
     * @param name
     */
    public async describeByName(namespace: string, name: string) : Promise<ObjectNode> {
        let nodes = this.objectMap.get(name)
        if (!nodes) return undefined
        let node = nodes.find(n => n.object.namespace === namespace)
        if (!node) node = nodes[0]
        return this.describe(node)
    }

    /**
     * Describe the given database object
     * TODO Is this useless, seems like it
     */
    public async describe(node: ObjectNode) : Promise<ObjectNode> {
        return node
    }

    /**
     * Execute the sql statement for the first time
     */
    public async execute(sql: SqlStatement) : Promise<SqlResult> {
        let autocommit = sql.suppressTxn ? true : this.currentConnection.autoCommit
        // Set the data first so we can find it
        let data = <StatementData>{sql: sql, connection: undefined, cursor: undefined, result: new SqlResult(sql.id)}
        try {
            this.statements.set(sql.id, data)
            // Connect and set connection settings
            this.logCall("execute", "dataSource.connect", true)
            let connection = await this.dataSource.connect(autocommit)
            this.logCall("execute", "dataSource.connect", false)
            connection.fetchSize = this.currentConnection.fetchLimit || 500
            this.logCall("execute", "connection.begin", true)
            if (!connection.autoCommit) await connection.begin()
            this.logCall("execute", "connection.begin", false)
            data.connection = connection
            return await this.doExecute(data)
        }
        catch (error) {
            console.log(JSON.stringify(error))
            data.result.error = `Error getting connection: ${error}`
            return data.result
        }
    }

    private async doExecute(data: StatementData) : Promise<SqlResult> {
        try {
            let start = process.hrtime()
            this.logCall("doExecute", "connection.execute", true)
            let cursor = await data.connection.execute(data.sql.sql)
            this.logCall("doExecute", "connection.execute", false)
            data.cursor = cursor
            this.logCall("doExecute", "cursor.fetch", true)
            let rowSet = await cursor.fetch()
            this.logCall("doExecute", "cursor.fetch", false)
            let elapsed = process.hrtime(start)
            data.result.update(rowSet, elapsed[0], data.connection.autoCommit)
            return data.result
        }
        catch(error) {
            console.log(JSON.stringify(error))
            data.result.error = error.message
            return data.result
        }
    }

    /**
     * Fetch more results
     */
    public async fetch(id: string) : Promise<SqlResult> {
        let data = this.statements.get(id)
        if (!data) throw new Error(`No statement found for ${id}`)
        let set = await data.cursor.fetch()
        data.result.update(set, 0, data.connection.autoCommit)
        return data.result
    }

    /**
     * Re-execute the sql statement
     */
    public async reexecute(id: string) : Promise<SqlResult> {
        let data = this.statements.get(id)
        if (!data) throw new Error(`No statement found for ${id}`)
        await data.cursor.close();
        return this.doExecute(data)
    }

    /**
     * Cancel the sql statement
     */
    public async cancel(id: string) : Promise<SqlResult> {
        let data = this.getData(id)
        this.logCall("cancel", "cursor.close", true)
        if (data.cursor) await data.cursor.close()
        this.logCall("cancel", "cursor.close", false)
        this.logCall("cancel", "connection.rollback", true)
        if (data.connection && !data.connection.autoCommit) await data.connection.rollback()
        this.logCall("cancel", "connection.rollback", false)
        this.logCall("cancel", "connection.close", true)
        if (data.connection) await data.connection.close()
        this.logCall("cancel", "connection.close", false)
        data.result.status = "cancelled"
        return data.result
    }

    /**
     * Commit the sql statement
     */
    public async commit(id: string) : Promise<SqlResult> {
        let data = this.getData(id)
        this.logCall("commit", "cursor.close", true)
        await data.cursor.close()
        this.logCall("commit", "cursor.close", false)
        this.logCall("commit", "connection.commit", true)
        await data.connection.commit()
        this.logCall("commit", "connection.commit", false)
        data.result.status = "committed"
        data.result.inTxn = false
        return data.result
    }

    /**
     * Rollback the sql statement
     */
    public async rollback(id: string) : Promise<SqlResult> {
        let data = this.getData(id)
        this.logCall("rollback", "cursor.close", true)
        await data.cursor.close()
        this.logCall("rollback", "cursor.close", false)
        this.logCall("rollback", "connection.rollback", true)
        await data.connection.rollback()
        this.logCall("rollback", "connection.rollback", false)
        data.result.status = "rolledback"
        data.result.inTxn = false
        return data.result
    }

    /**
     * Close the sql statement
     */
    public async close(id: string) {
        try {
            let data = this.getData(id)
            this.logCall("close", "cursor.close", true)
            if (data.cursor) await data.cursor.close()
            this.logCall("close", "cursor.close", false)
            this.logCall("close", "connection.rollback", true)
            if (data.connection && !data.connection.autoCommit) await data.connection.rollback()
            this.logCall("close", "connection.rollback", false)
            this.logCall("close", "connection.close", true)
            if (data.connection) await data.connection.close()
            this.logCall("close", "connection.close", false)
            this.statements.delete(id)
        } catch (error) {
            console.error(`Error closing statement ${id}: ${error}`)
        }
    }

    /**
     * Get the data from the given id or throw an error
     */
    private getData(id: string) : StatementData {
        let data = this.statements.get(id)
        if (!data) throw new Error(`No statement found for id ${id}`)
        return data
    }

    /**
     * Parse the given SQL and returning item expcted at cursor
     */
    public async parse(sql: string, offset: number) : Promise<any> {
        try {
            return this.parser.findSymbol(sql, offset)
        } catch (error) {
            console.log(error)
            return undefined
        }
    }

    /**
     * Return the SchemaNodes for the current connection
     */
    public getSchemaNodes() : NamespaceNode[] {
        return this.nsNodes
    }

    /**
     * Cache and return the objects for the given schema
     */
    public async getSchemaObjects(schema: NamespaceNode) : Promise<TypeNode[]> {
        return schema.typeNodes
    }

    /**
     * Print diagnostic messages
     */
    private logCall(inMethod: string, call: string, start: boolean) {
        if (!this.debug) return
        this.outputChannel.appendLine(`${inMethod}: ${start ? "START" : "FINISH"} : ${call}`)
    }

}