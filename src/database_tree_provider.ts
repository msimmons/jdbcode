import * as vscode from 'vscode'
import { TreeDataProvider, TreeItem, TreeItemCollapsibleState, EventEmitter } from 'vscode'
import { NamespaceNode, TypeNode, TreeNode } from './models'
import { DatabaseService } from './database_service';

export class DatabaseTreeProvider implements TreeDataProvider<object> {

    public viewId = 'jdbcode.schemaTree';
    private onDidChangeEmitter = new EventEmitter<object>()
    private service: DatabaseService

    constructor(service: DatabaseService) {
        this.service = service
    }

    public clear() {
        this.onDidChangeEmitter.fire(null)
    }

	get onDidChangeTreeData() {
		return this.onDidChangeEmitter.event
	}

    public getTreeItem(element: TreeNode) : TreeItem {
        return element.getTreeItem()
    }

    public getChildren(element: TreeNode) : object[] | Thenable<object[]> {
        if ( !element ) {
            return this.service.getSchemaNodes()
        }
        switch ( element.type ) {
            case 'namespace':
                return this.service.getSchemaObjects(element as NamespaceNode)
            case 'type':
                return (element as TypeNode).objectNodes
        }
    }

}
    