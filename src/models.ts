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
}