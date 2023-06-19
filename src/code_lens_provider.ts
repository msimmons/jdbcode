import * as vscode from 'vscode'
import { SqlParser } from './sql_parser';

export class CodeLensProvider implements vscode.CodeLensProvider {

  onDidChangeCodeLenses?: vscode.Event<void>;
  parser: SqlParser

  constructor() {
    this.parser = new SqlParser()
  }

  provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
    let parsed = this.parser.findStatements(document.getText())
    return parsed.map(p => {
      let start = document.positionAt(p.start)
      let end = document.positionAt(p.end)
      let range = new vscode.Range(start, end)
      return new vscode.CodeLens(range, {command: 'jdbcode.execute', title: 'execute', arguments: [range]})
    })
  }
 
  resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
    throw new Error('Method not implemented.');
  }
}