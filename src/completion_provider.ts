import * as vscode from 'vscode'
import { CompletionItemKind } from 'vscode';
import { SchemaData, SchemaObject } from './models'
import { doDescribe } from './extension'

export class CompletionProvider implements vscode.CompletionItemProvider {

    private keywords: vscode.CompletionItem[] = [
        new vscode.CompletionItem('select', vscode.CompletionItemKind.Keyword),
        new vscode.CompletionItem('insert', vscode.CompletionItemKind.Keyword),
        new vscode.CompletionItem('update', vscode.CompletionItemKind.Keyword),
        new vscode.CompletionItem('delete', vscode.CompletionItemKind.Keyword)
    ]

    private schemaData: SchemaData[]
    private schemaItems: vscode.CompletionItem[] = []
    private tableItems: vscode.CompletionItem[] = []
    private jvmcode: any = vscode.extensions.getExtension('contrapt.jvmcode').exports

    setSchemas(schemas: SchemaData[]) {
        this.schemaData = schemas
        let result = []
        schemas.forEach((schema) => {
            this.schemaItems.push(new vscode.CompletionItem(schema.name, CompletionItemKind.Module))
            schema.object_types.forEach((type) => {
                result = result.concat(type.objects.forEach((obj) => {
                    let item = new vscode.CompletionItem(obj.name, CompletionItemKind.Class)
                    item.detail = obj.owner
                    if (type.name === 'table') {
                        this.tableItems.push(item)
                    }
                }))
            })
        })
    }

    setKeywords(keywords: string[]) {
        let additionalKeywords = keywords.map((k) => { return new vscode.CompletionItem(k, CompletionItemKind.Keyword) })
        this.keywords = this.keywords.concat(additionalKeywords)
    }

    resolveCompletionItem?(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
        throw new Error("Method not implemented.");
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        let range = this.getSqlRange(position, document)
        let sql = document.getText(range)
        // Calculate the caret position's character offset relative to this block of SQL (0 based)
        let caretOffset = document.offsetAt(position) - document.offsetAt(range.start)
        return this.getCompletionItems(sql, caretOffset)
    }

    private async getCompletionItems(sql, caretOffset) {
        let result = await this.jvmcode.send('jdbcode.parse', {sql: sql, char: caretOffset})
        let item = result.body
        switch (item.type) {
            case 'column_expr':
                return this.getColumnItems(item)
            case 'table_list':
                return this.schemaItems.concat(this.tableItems)
            case 'select_list':
                return this.getColumnItems(item)
            case 'table_item':
                return this.schemaItems.concat(this.tableItems)
            case 'syntax_error':
                return item.expected.map((it) => {return new vscode.CompletionItem(it)})
            default:
                return this.keywords
        }
    }

    private getSqlRange(position: vscode.Position, document: vscode.TextDocument) : vscode.Range {
        // Search forwards for empty line or semicolon line ending
        let endLine
        for (endLine = position.line; endLine < document.lineCount; endLine++) {
            if (!document.lineAt(endLine+1).text) break
            if (document.lineAt(endLine).text.endsWith(';')) break
        }
        // Search backwards for empty line or semicolon
        let startLine
        for (startLine = position.line; startLine > 0; startLine--) {
            if (!document.lineAt(startLine-1).text) break
            if (document.lineAt(startLine-1).text.endsWith(';')) break
        }
        let start = new vscode.Position(startLine, 0)
        let end = new vscode.Position(endLine, document.lineAt(endLine).text.length)
        return new vscode.Range(start, end)
    }

    private getColumnItems(item: any): Promise<vscode.CompletionItem[]> {
        let obj = new SchemaObject()
        let tableItem = {owner: '', name: ''}
        if (!item.tableAlias) {
            for (var key in item.tableMap) {
                tableItem = item.tableMap[key]
                break
            }
        } else {
            tableItem = item.tableMap[item.tableAlias]
        }
        obj.owner = tableItem.owner
        obj.name = tableItem.name
        obj.type = 'table'
        let described = doDescribe(obj)
        return new Promise<vscode.CompletionItem[]>((resolve, reject) => {
            described.then((reply) => {
                let columnItems = reply.columns.map(column => {
                    let ci = new vscode.CompletionItem(column.name, vscode.CompletionItemKind.Field)
                    ci.detail = obj.name
                    return ci
                })
                resolve(columnItems)
            }).catch((error) => {
                console.log(error.message)
                resolve([])
            })
        })
    }

}