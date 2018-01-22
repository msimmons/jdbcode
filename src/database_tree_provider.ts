import * as vscode from 'vscode'
import { TreeDataProvider, TreeItem, TreeItemCollapsibleState, EventEmitter } from 'vscode'
import { SchemaData, SchemaType, TreeNode } from './models'

export class DatabaseTreeProvider implements TreeDataProvider<object> {

    public viewId = 'jdbcode.schemaTree';
    
    private schemas: object[]
    private connection: object
    private onDidChangeEmitter = new EventEmitter<object>()

    constructor() {
    }

    public clearSchemas() {
        this.connection = null
        this.schemas = null
        this.onDidChangeEmitter.fire(null)
    }

    public setSchemas(connection: object, schemas: object[]) {
        this.schemas = schemas
        this.connection = connection
        this.onDidChangeEmitter.fire(null)
    }

	get onDidChangeTreeData() {
		return this.onDidChangeEmitter.event
	}

    public getTreeItem(element: TreeNode) : TreeItem {
        switch ( element.type ) {
            case 'schema':
            case 'catalog': {
                let item = new TreeItem(`${element.name} (${element.type})`, TreeItemCollapsibleState.Collapsed)
                item.contextValue = element.type
                //item.iconPath =
                return item
            }
            case 'object_type': {
                let item = new TreeItem(element.name, TreeItemCollapsibleState.Collapsed)
                item.contextValue = element.type
                //item.iconPath = 
                return item
            }
            default: {
                let item = new TreeItem(element.name, TreeItemCollapsibleState.None)
                item.command = {command: 'jdbcode.describe', arguments: [element], title: 'Describe the object'}
                return item
            }
        }
    }

    public getChildren(element: TreeNode) : object[] | Thenable<object[]> {
        if ( !this.schemas ) {
            return []
        }
        else if ( !element ) {
            return this.schemas
        }
        switch ( element.type ) {
            case 'schema':
            case 'catalog': {
                return this.getObjects(element as SchemaData)
            }
            case 'object_type': {
                return (element as SchemaType).objects
            }
        }
    }

    private getObjects(schema: SchemaData) : TreeNode[] | Thenable<TreeNode[]> {
        if ( schema.resolved ) return schema.object_types
        let api = vscode.extensions.getExtension('contrapt.jvmcode').exports
        return new Promise<TreeNode[]>((resolve, reject) => {
            api.send('jdbcode.objects', {connection: this.connection, schema: schema}).then((reply) => {
                schema.object_types = reply.body['object_types'].map((type) => { 
                    let objects = reply.body['objects'][type]
                    return {name: type, type: 'object_type', objects: objects} as SchemaType
                })
                resolve(schema.object_types)
            })
        })
    }

}
    