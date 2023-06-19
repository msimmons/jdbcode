import { Grammar } from './sql_grammar'

export interface ContentResult {
  sql: string
  start: number
  end: number
}

export class SqlParser {

  /**
   * Find all the statements in the given text and return an array of [ContentResult](#ContentResult)
   * @param contents 
   * @returns ContentResult[]
   */
  findStatements(text: string) : ContentResult[] {
    let statements = Grammar.Statements.tryParse(text)
    return statements.filter(n => n.name === 'SQL').map(n => { return {sql: n.value, start: n.start.offset, end: n.end.offset}})
  }

  /**
   * Find the sql statement in the given text at the start and end offsets
   * @param text 
   * @param start
   * @param end 
   */
  findStatement(text: string, start: number, end: number) : string|undefined {
    let statements = Grammar.Statements.tryParse(text)
    let statementIndex = statements.findIndex(s => s.start.offset <= start && s.end.offset >= end)
    if (statementIndex === -1) return undefined
    // If we are on a separator, return the previous statement
    if (statements[statementIndex].name === 'Separator' && statementIndex > 0) statementIndex--;
    return statements[statementIndex].value
  }

  /**
   * Find the type of symbol we are on at the current position
   */
  findSymbol(text: string, offset: number) : string|undefined {
    let statement = this.findStatement(text, offset, offset)
    let parsed = Grammar.SelectStatement.tryParse(statement)
    console.log(parsed)
    return undefined
  }
}