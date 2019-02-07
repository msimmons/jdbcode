import { SchemaData, SchemaType, TypeData, ObjectData, TableData, ProcedureData } from 'server-models'
import { TreeItem, TreeItemCollapsibleState } from 'vscode'

export interface ResultSet {
    sqlStatement: SqlStatement,
    html: string
}

export class SqlStatement {
    columns: string[] = []
    rows: any[][] = []
    id: string
    connection: string
    sql: string
    status: string
}

export interface ObjectDescription {
    dbObject: ObjectNode
    html: string
}

type TreeNodeType = "namespace" | "type" | "object"

export interface TreeNode {
    getTreeItem() : TreeItem
    type : TreeNodeType
}

export class SchemaNode implements TreeNode {
    data: SchemaData
    type: TreeNodeType
    resolved: boolean
    typeNodes: TypeNode[]
    constructor(data: SchemaData) {
        this.data = data
        this.type = "namespace"
    }
    getTreeItem() : TreeItem {
        let item = new TreeItem(`${this.data.name} (${this.data.type})`, TreeItemCollapsibleState.Collapsed)
        item.contextValue = this.data.type
        //item.iconPath =
        return item
    }
}

export class TypeNode implements TreeNode {
    data: TypeData
    type: TreeNodeType
    objects: ObjectNode[]
    constructor(data: TypeData) {
        this.data = data
        this.type = "type"
    }
    getTreeItem() : TreeItem {
        let item = new TreeItem(this.data.name, TreeItemCollapsibleState.Collapsed)
        item.contextValue = this.data.name
        //item.iconPath = 
        return item
    }
}

export class ObjectNode implements TreeNode {
    data: ObjectData
    type: TreeNodeType
    resolved?: TableData | ProcedureData
    constructor(data: ObjectData) {
        this.data = data
        this.type = "object"
    }
    getTreeItem() : TreeItem {
        let item = new TreeItem(this.data.name, TreeItemCollapsibleState.None)
        item.command = {command: 'jdbcode.describe', arguments: [this], title: 'Describe the object'}
        return item
    }
}