import { Grammar } from './sql_grammar'
import * as vscode from 'vscode'

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
    let statement = statements.find(s => s.start.offset <= start && s.end.offset >= end)
    return statement?.value
  }
}