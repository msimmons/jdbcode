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
    dbObject: SchemaObject
    html: string
}

export interface TreeNode {
    type: string
    name: string
}

export class SchemaData implements TreeNode {
    name: string
    type: string
    resolved: boolean
    object_types: SchemaType[]
}

export class SchemaType implements TreeNode {
    name: string
    type: string
    objects: SchemaObject[]
}

export class SchemaObject implements TreeNode {
    owner: any
    name: string
    type: string
    connection: string
    columns: any[]
    rows: string[]
}