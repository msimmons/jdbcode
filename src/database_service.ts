'use strict'

import * as vscode from 'vscode'
import { SchemaNode, TypeNode, ObjectNode } from './models';
import { SchemaData, ConnectionData, DriverData, ConnectionResult, ParseItem, SqlStatement, SqlResult } from 'server-models';

export class DatabaseService {

    private context: vscode.ExtensionContext
    private jvmcode: any
    private schemaNodes: SchemaNode []
    private objectMap: Map<string, ObjectNode[]> = new Map()
    private currentConnection?: ConnectionData

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
        let reply = await this.jvmcode.send('jdbcode.connect', { connection: connection, driver: driver })
        let data = reply.body as ConnectionResult
        this.currentConnection = connection
        this.mapSchemaNodes(data)
    }

    /**
     * Refresh the current connection getting new schema data etc
     */
    public async refresh() {
        let reply = await this.jvmcode.send('jdbcode.refresh', {connection: this.currentConnection})
        this.mapSchemaNodes(reply.body as ConnectionResult)
    }

    /**
     * Turn the ConnectionResult into SchemaNodes
     * @param data 
     */
    private mapSchemaNodes(data: ConnectionResult) {
        this.objectMap.clear()
        this.schemaNodes = data.schemas.map((s) => { 
            let schema = new SchemaNode(s)
            schema.typeNodes = schema.data.objectTypes.map((ot) => {
                let tn = new TypeNode(ot)
                tn.objects = tn.data.objects.map((o) => {
                    let on = new ObjectNode(o)
                    if (!this.objectMap.has(o.name)) this.objectMap.set(o.name, [])
                    this.objectMap.get(o.name).push(on)
                    return  on
                })
                return tn
            })
            schema.resolved = true
            return schema
        })
    }

    /**
     * Disconnect the current connection
     */
    public async disconnect() {
        await this.jvmcode.send('jdbcode.disconnect', {connection: this.currentConnection})
        this.currentConnection = undefined
        this.schemaNodes = []
    }

    /**
     * Find the given db object and describe it
     * @param namespace
     * @param name
     */
    public async describeByName(namespace: string, name: string) : Promise<ObjectNode> {
        let nodes = this.objectMap.get(name)
        if (!nodes) return undefined
        let node = nodes.find(n => n.data.owner.catalog === namespace || n.data.owner.schema === namespace)
        if (!node) node = nodes[0]
        return this.describe(node)
    }

    /**
     * Describe the given database object
     */
    public async describe(node: ObjectNode) : Promise<ObjectNode> {
        if (node.resolved) return node
        let reply = await this.jvmcode.send('jdbcode.describe', {connection: this.currentConnection, dbObject: node.data})
        node.resolved = reply.body
        return node
    }

    /**
     * Execute the sql statement
     */
    public async execute(sql: SqlStatement) : Promise<SqlResult> {
        let result= await this.jvmcode.send('jdbcode.execute', sql)
        return result.body as SqlResult
    }

    /**
     * Re-execute the sql statement
     */
    public async reexecute(sql: SqlStatement) : Promise<SqlResult> {
        let result = await this.jvmcode.send('jdbcode.reexecute', sql)
        return result.body as SqlResult
    }

    /**
     * Cancel the sql statement
     */
    public async cancel(id: string) : Promise<SqlResult> {
        let result = await this.jvmcode.send('jdbcode.cancel', {id: id})
        return result.body as SqlResult
    }

    /**
     * Commit the sql statement
     */
    public async commit(id: string) : Promise<SqlResult> {
        let result = await this.jvmcode.send('jdbcode.commit', {id: id})
        return result.body as SqlResult
    }

    /**
     * Rollback the sql statement
     */
    public async rollback(id: string) : Promise<SqlResult> {
        let result = await this.jvmcode.send('jdbcode.rollback', {id: id})
        return result.body as SqlResult
    }

    /**
     * Close the sql statement
     */
    public async close(id: string) {
        await this.jvmcode.send('jdbcode.close', {id: id})
    }

    /**
     * Parse the given SQL and returning item expcted at cursor
     */
    public async parse(sql: string, offset: number) : Promise<ParseItem> {
        let reply = await this.jvmcode.send('jdbcode.parse', {sql: sql, char: offset})
        return reply.body
    }

    /**
     * Return the SchemaNodes for the current connection
     */
    public getSchemaNodes() : SchemaNode[] {
        return this.schemaNodes
    }

    /**
     * Cache and return the objects for the given schema
     */
    public async getSchemaObjects(schema: SchemaNode) : Promise<TypeNode[]> {
        if (schema.resolved) return schema.typeNodes
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
    }

}