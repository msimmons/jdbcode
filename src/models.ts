import { TreeItem, TreeItemCollapsibleState } from 'vscode'
import { Namespace, TableData, ViewData, ProcedureData, SequenceData, SynonymData, OtherData, RowSet } from 'tsdbc'

export interface DriverData {
    name: string
    driverFile: string
}

export interface ConnectionData {
    driver: string
    name: string
    username: string
    password: string
    host: string
    port?: number
    database?: string
    autoCommit: boolean
    fetchLimit: number
    excludes: string[]
    includes: string[]
    maxPoolSize: number
    validationQuery?: string
}

export interface SqlStatement {
    connection: string;
    id: string;
    sql: string;
    suppressTxn: boolean;
}

type StatementStatus = "executing" | "executed" | "committed" | "rolledback" | "cancelled";
type StatementType = "query" | "crud";
export class SqlResult {
    columns: string[] = []
    error: string = undefined
    executionCount: number = 0
    executionTime: number = 0
    id: string
    inTxn: boolean = false
    moreRows: boolean = false
    rows: any[] = []
    status: StatementStatus = "executing"
    type: StatementType = "query"
    updateCount: number = 0

    constructor(id: string) {
        this.id = id
    }

    update(rowSet: RowSet, elapsed: number, autoCommit: boolean) {
        this.columns = rowSet.columns
        this.rows = rowSet.rows
        this.executionCount++
        this.executionTime += elapsed
        this.moreRows = rowSet.moreRows
        this.status = "executed"
        if (this.columns.length > 0) {
            this.type = "query"
            this.updateCount = -1
            this.inTxn = false
        }
        else {
            this.type = "crud"
            this.updateCount = rowSet.rowCount
            this.inTxn = !autoCommit
        }
    }
}

//deprecated
export interface ResultSet {
    sqlStatement: SqlStatement,
    html: string
}

// deprecated?
export interface ObjectDescription {
    dbObject: ObjectNode
    html: string
}

type TreeNodeType = "namespace" | "type" | "object"
export interface TreeNode {
    getTreeItem() : TreeItem
    type : TreeNodeType
}

export class NamespaceNode implements TreeNode {
    data: Namespace
    type: TreeNodeType
    resolved: boolean
    typeNodes: TypeNode[]
    constructor(data: Namespace) {
        this.data = data
        this.type = "namespace"
        this.typeNodes = []
    }
    getTreeItem() : TreeItem {
        let item = new TreeItem(`${this.data.name}`, TreeItemCollapsibleState.Collapsed)
        item.contextValue = "namespace"
        item.tooltip = "" //this.data.error
        return item
    }
}

type ObjectType = "table" | "index" | "view" | "procedure" | "function" | "sequence" | "synonym" | "other"
export type ObjectData = TableData | ViewData | ProcedureData | SequenceData | SynonymData | OtherData

export class TypeNode implements TreeNode {
    objectType: ObjectType
    type: TreeNodeType
    objects: ObjectData[]
    objectNodes: ObjectNode[]
    constructor(objectType: ObjectType, objects: ObjectData[]) {
        this.objects = objects
        this.objectType = objectType
        this.type = "type"
        this.objectNodes = objects.map(o => new ObjectNode(o, objectType)).sort((o1,o2) => o1.object.name.localeCompare(o2.object.name))
    }
    getTreeItem() : TreeItem {
        let item = new TreeItem(this.objectType, TreeItemCollapsibleState.Collapsed)
        item.contextValue = this.objectType
        return item
    }
}

export class ObjectNode implements TreeNode {
    object: ObjectData
    objectType: ObjectType
    type: TreeNodeType
    constructor(object: ObjectData, objectType: ObjectType) {
        this.object = object
        this.objectType = objectType
        this.type = "object"
    }
    getTreeItem() : TreeItem {
        let item = new TreeItem(this.object.name, TreeItemCollapsibleState.None)
        item.command = {command: 'jdbcode.describe', arguments: [this], title: 'Describe the object'}
        return item
    }
}