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
    private jvmcode: any
    private nsNodes: NamespaceNode []
    private objectMap: Map<string, ObjectNode[]> = new Map()
    private currentConnection?: ConnectionData
    private dataSource: DataSource
    private statements = new Map<string, StatementData>()

    constructor(context: vscode.ExtensionContext) {
        this.context = context
        this.jvmcode = vscode.extensions.getExtension('contrapt.jvmcode').exports
    }

    getConnection() : ConnectionData {
        return this.currentConnection
    }

    /**
     * Open a connection with given connection and driver config
     */
    public async connect(connection: ConnectionData, driver: DriverData) {
        let dbDriver = await DriverManager.load(driver.driverFile)
        let driverConfig = <DriverConfig>{host: connection.host, port: connection.port, username: connection.username, password: connection.password, database: connection.database}
        this.dataSource = dbDriver.load(driverConfig)
        let metaData = await this.dataSource.metaData()
        console.log(metaData)
        //let reply = await this.jvmcode.send('jdbcode.connect', { connection: connection, driver: driver })
        //let data = reply.body as ConnectionResult
        this.currentConnection = connection
        this.mapSchemaNodes(metaData)
    }

    /**
     * Refresh the current connection getting new schema data etc
     */
    public async refresh() {
        let metaData = await this.dataSource.metaData()
        //let reply = await this.jvmcode.send('jdbcode.refresh', {connection: this.currentConnection})
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
        this.nsNodes = data.namespaces.filter(nsNode => !excludes.find(e => nsNode.name.startsWith(e)))
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
        }).filter(nsNode => nsNode.typeNodes.length > 0).sort((ns1,ns2) => ns1.data.name.localeCompare(ns2.data.name))
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
        //await this.jvmcode.send('jdbcode.disconnect', {connection: this.currentConnection})
        await this.dataSource.close()
        this.dataSource = undefined
        this.currentConnection = undefined
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
     */
    public async describe(node: ObjectNode) : Promise<ObjectNode> {
        return node
        //let reply = await this.jvmcode.send('jdbcode.describe', {connection: this.currentConnection, dbObject: node.data})
    }

    /**
     * Execute the sql statement for the first time
     */
    public async execute(sql: SqlStatement) : Promise<SqlResult> {
        let autocommit = sql.suppressTxn ? true : this.currentConnection.autoCommit
        try {
            let connection = await this.dataSource.connect(autocommit)
            connection.fetchSize = this.currentConnection.fetchLimit
            if (!connection.autoCommit) await connection.begin()
            let data = <StatementData>{sql: sql, connection: connection, cursor: undefined, result: new SqlResult(sql.id)}
            this.statements.set(sql.id, data)
            return await this.doExecute(data)
        }
        catch (error) {
            return <SqlResult>{id: sql.id, error: `Error getting connection: ${error}`}
        }
    }
    
    private async doExecute(data: StatementData) : Promise<SqlResult> {
        try {
            let start = process.hrtime()
            let cursor = await data.connection.execute(data.sql.sql)
            data.cursor = cursor
            let rowSet = await cursor.fetch()
            let elapsed = process.hrtime(start)
            data.result.update(rowSet, elapsed[0])
            return data.result
        }
        catch(error) {
            data.result.error = error
            return data.result
        }
        //let result= await this.jvmcode.send('jdbcode.execute', sql)
    }

    /**
     * Fetch more results
     */
    public async fetch(id: string) : Promise<SqlResult> {
        let data = this.statements.get(id)
        if (!data) throw new Error(`No statement found for ${id}`)
        //let result= await this.jvmcode.send('jdbcode.fetch', {id: id})
        let set = await data.cursor.fetch()
        data.result.update(set, 0)
        return data.result
        //return result.body as SqlResult
    }

    /**
     * Re-execute the sql statement
     */
    public async reexecute(id: string) : Promise<SqlResult> {
        //let result = await this.jvmcode.send('jdbcode.reexecute', {id: id})
        //return result.body as SqlResult
        return undefined
    }

    /**
     * Cancel the sql statement
     */
    public async cancel(id: string) : Promise<SqlResult> {
        //let result = await this.jvmcode.send('jdbcode.cancel', {id: id})
        let data = this.getData(id)
        data.cursor.close()
        data.connection.close()
        data.result.status = "cancelled"
        return data.result
    }

    /**
     * Commit the sql statement
     */
    public async commit(id: string) : Promise<SqlResult> {
        //let result = await this.jvmcode.send('jdbcode.commit', {id: id})
        //return result.body as SqlResult
        return undefined
    }

    /**
     * Rollback the sql statement
     */
    public async rollback(id: string) : Promise<SqlResult> {
        //let result = await this.jvmcode.send('jdbcode.rollback', {id: id})
        //return result.body as SqlResult
        return undefined
    }

    /**
     * Close the sql statement
     */
    public async close(id: string) {
        let data = this.getData(id)
        if (data.cursor) await data.cursor.close()
        if (data.connection) await data.connection.close()
        //await this.jvmcode.send('jdbcode.close', {id: id})
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
        //let reply = await this.jvmcode.send('jdbcode.parse', {sql: sql, char: offset})
        //return reply.body
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
/*
        let reply = await this.jvmcode.send('jdbcode.objects', {connection: this.currentConnection, schema: schema.data})
        let resolved = reply.body as SchemaData
        schema.data.objectTypes = resolved.objectTypes
        schema.typeNodes = resolved.objectTypes.map((type) => {
            let typeNode = new TypeNode(type)
            typeNode.objects = type.objects.map((o) => {
                return new ObjectNode(o)
            })
            return typeNode
        })
        schema.resolved = true
        return schema.typeNodes
*/
    }

}