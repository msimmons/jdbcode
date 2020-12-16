'use strict'

import * as vscode from 'vscode'
import { NamespaceNode, TypeNode, ObjectNode, SqlStatement, SqlResult, ConnectionData, DriverData } from './models';
import { DriverConfig, DriverManager, DatabaseMetadata, DataSource, Connection, RowSet, Result } from 'tsdbc'

interface StatementData {
    sql: SqlStatement
    connection: Connection
    cursor: Result
    result: SqlResult
}

export class DatabaseService {

    private context: vscode.ExtensionContext
    private nsNodes: NamespaceNode []
    /* Map objects by name for convenience */
    private objectMap: Map<string, ObjectNode[]> = new Map()
    private currentConnection?: ConnectionData
    private dataSource: DataSource
    private statements = new Map<string, StatementData>()

    constructor(context: vscode.ExtensionContext) {
        this.context = context
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
    public async connect(connection: ConnectionData, driver: DriverData) {
        let dbDriver = await DriverManager.load(driver.driverFile)
        let driverConfig = <DriverConfig>{
            host: connection.host, 
            port: connection.port, 
            username: connection.username, 
            password: connection.password, 
            database: connection.database
            // TODO: vendorConfig
        }
        this.dataSource = dbDriver.load(driverConfig)
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
        await this.dataSource.close()
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
            let connection = await this.dataSource.connect(autocommit)
            connection.fetchSize = this.currentConnection.fetchLimit || 500
            if (!connection.autoCommit) await connection.begin()
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
            let cursor = await data.connection.execute(data.sql.sql)
            data.cursor = cursor
            let rowSet = await cursor.fetch()
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
        if (data.cursor) await data.cursor.close()
        if (data.connection && !data.connection.autoCommit) await data.connection.rollback()
        if (data.connection) await data.connection.close()
        data.result.status = "cancelled"
        return data.result
    }

    /**
     * Commit the sql statement
     */
    public async commit(id: string) : Promise<SqlResult> {
        let data = this.getData(id)
        await data.connection.commit()
        await data.cursor.close()
        data.result.status = "committed"
        data.result.inTxn = false
        return data.result
    }

    /**
     * Rollback the sql statement
     */
    public async rollback(id: string) : Promise<SqlResult> {
        let data = this.getData(id)
        await data.cursor.close()
        await data.connection.rollback()
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
            if (data.cursor) await data.cursor.close()
            if (data.connection && !data.connection.autoCommit) await data.connection.rollback()
            if (data.connection) await data.connection.close()
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
        return undefined
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

}