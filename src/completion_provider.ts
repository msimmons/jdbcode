import * as vscode from 'vscode'
import { CompletionItemKind } from 'vscode';
import { SchemaData } from './models'
import { SqlParser } from './sql_parser'

export class CompletionProvider implements vscode.CompletionItemProvider {

    private keywords: vscode.CompletionItem[] = [
        new vscode.CompletionItem('select', vscode.CompletionItemKind.Keyword),
        new vscode.CompletionItem('insert', vscode.CompletionItemKind.Keyword),
        new vscode.CompletionItem('update', vscode.CompletionItemKind.Keyword),
        new vscode.CompletionItem('delete', vscode.CompletionItemKind.Keyword)
    ]

    private objects: vscode.CompletionItem[] = []

    setSchemas(schemas: SchemaData[]) {
        let result = []
        schemas.forEach((schema) => {
            schema.object_types.forEach((type) => {
                result = result.concat(type.objects.map((obj) => {
                    return new vscode.CompletionItem(obj.owner+'.'+obj.name, CompletionItemKind.Class)
                }))
            })
        })
        this.objects = result
    }

    setKeywords(keywords: string[]) {
        let additionalKeywords = keywords.map((k) => { return new vscode.CompletionItem(k, CompletionItemKind.Keyword)})
        this.keywords = this.keywords.concat(additionalKeywords)
    }

    resolveCompletionItem?(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
        throw new Error("Method not implemented.");
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        // Find the beginning of the SQL statement (for now beginning of line)
        let start = new vscode.Position(position.line, 0)
        let sql = document.lineAt(position.line).text
        // Parse from beginning to end (for now end of line)
        let parser = new SqlParser()
        let result = parser.parse(sql, position)
        console.log(result)
        // Find the type of thing needed at position
        let item = new vscode.CompletionItem(result['type']+' '+result['of'], CompletionItemKind.Class)
        return this.keywords.concat([item])
    }

    
}