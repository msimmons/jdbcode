export enum TransactionIsolation {
  ReadUncommitted,
  ReadCommitted,
  RepeatableRead,
  Serializable,
  None
}

export interface GrantData {
  grantee: string
  privileges: string[]
}

export interface TableData {
  namespace: string
  name: string
  columns: ColumnData[]
  indices: string[]
  grants?: GrantData[]
}
export interface IndexData {
  name: string
  unique: boolean
  position: number
  descending: boolean
  filter?: string
}
export interface RefData {
  namespace: string
  table: string
  column: string
}
export interface ColumnData {
  name: string
  type: string
  position: number
  size?: number
  default?: string
  nullable?: boolean
  autoincrement?: boolean
  keySequence?: number
  references?: RefData
  indices: IndexData[]
}
export interface ViewData {
  namespace: string
  name: string
  columns: ColumnData[]
  grants?: GrantData[]
}
export interface SequenceData {
  namespace: string
  name: string
}
export interface ParameterData {
  name: string
  type: string
  inOut: string
  default?: string
  position: number
  nullable?: boolean
}
export interface ProcedureData {
  namespace: string
  name: string
  parameters: ParameterData[]
  grants?: GrantData[]
}
export interface SynonymData{
  namespace: string
  name: string
  targetNamespace: string
  target: string
}

export interface OtherData{
  namespace: string
  name: string
  type: string
  vendor: any
}

export interface PlanData {
}

export interface Namespace { // Schemas and Catalogs
  name: string
  tables: TableData[]
  views: ViewData[]
  sequences: SequenceData[]
  procedures: ProcedureData[]
  synonyms: SynonymData[]
  others: OtherData[]
}
export interface DatabaseMetadata {
  namespaces: Namespace[]
}

export class DatabaseError extends Error {
  readonly code: string
  readonly message: string
  readonly vendor: any
}

export interface DriverConfig {
  host: string
  port?: number
  username: string
  password: string
  database: string
}

export interface DataSourceProvider {
  readonly name: string
  createDataSource(config: DriverConfig, vendorConfig?: any) : DataSource
}

export interface DataSource {
  connect(autoCommit?: boolean) : Promise<Connection>
  metaData() : Promise<DatabaseMetadata>
  clientInfo() : Promise<Map<string, string>>
  explain(sql: string): Promise<PlanData>
  close() : Promise<void>
}

export interface Connection {

  readonly transactionIsolation : TransactionIsolation
  readonly closed : boolean
  networkTimeout : number
  queryTimeout : number
  //readOnly : boolean
  autoCommit : boolean
  fetchSize : number

  // Statement related
  execute(sql: string, autogens?: string[]) : Promise<Result>

  // Transaction related
  begin(isolation?: TransactionIsolation) : Promise<void>
  setSavepoint(name?: string) : Promise<void>
  releaseSavepoint(savepoint: any) : Promise<void>
  rollback(savepoint?: any) : Promise<void>
  commit() : Promise<void>

  // Admin
  valid(timeout: number) : Promise<boolean>
  close() : Promise<void>
}

export interface RowSet {
  readonly id: number
  readonly columns: any[]
  readonly rows: any[]
  readonly moreRows: boolean
  readonly rowCount: number
}

export interface Result {
  readonly rowSets: RowSet[]
  fetch() : Promise<RowSet>
  close() : Promise<void>
}

export interface CallableStatement {
  // All the parameter and out param methods
}

export interface PreparedStatement {}