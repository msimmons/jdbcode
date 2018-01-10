import * as vscode from 'vscode'
import { TreeDataProvider, TreeItem, TreeItemCollapsibleState, EventEmitter } from 'vscode'

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

    public getTreeItem(element: object) : TreeItem {
        switch ( element['type'] ) {
            case 'schema':
            case 'catalog': {
                let item = new TreeItem(element['name'], TreeItemCollapsibleState.Collapsed)
                item.contextValue = element['type']
                item.iconPath = "$(database)"
                return item
            }
            case 'object_type': {
                let item = new TreeItem(element['name'], TreeItemCollapsibleState.Collapsed)
                item.contextValue = element['type']
                item.iconPath = "$(database)"
                return item
            }
            default: {
                let item = new TreeItem(element['name'], TreeItemCollapsibleState.None)
                return item
            }
        }
    }

    public getChildren(element: object) : object[] | Thenable<object[]> {
        if ( !this.schemas ) {
            return []
        }
        else if ( !element ) {
            return this.schemas
        }
        switch ( element['type'] ) {
            case 'schema':
            case 'catalog': {
                return this.getObjects(element)
            }
            case 'object_type': {
                return element['objects']
            }
        }
    }

    private getObjects(schema: object) : object[] | Thenable<object[]> {
        if ( schema['resolved'] ) return schema['object_types']
        let api = vscode.extensions.getExtension('contrapt.jvmcode').exports
        return new Promise<object[]>((resolve, reject) => {
            api.send('jdbcode.objects', {connection: this.connection, schema: schema}).then((reply) => {
                schema['object_types'] = reply.body['object_types'].map((type) => { 
                    let objects = reply.body['objects'][type]
                    return {name: type, type: 'object_type', objects: objects}
                })
                resolve(schema['object_types'])
            })
        })
    }

}
    