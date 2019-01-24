import * as vscode from 'vscode'
import { CompletionItemKind } from 'vscode';
import { trimSql } from './extension'
import { DatabaseService } from './database_service';
import { TableData } from 'server-models';

export class CompletionProvider implements vscode.CompletionItemProvider {

    private keywords: vscode.CompletionItem[] = [
        new vscode.CompletionItem('select', vscode.CompletionItemKind.Keyword),
        new vscode.CompletionItem('insert', vscode.CompletionItemKind.Keyword),
        new vscode.CompletionItem('update', vscode.CompletionItemKind.Keyword),
        new vscode.CompletionItem('delete', vscode.CompletionItemKind.Keyword)
    ]

    private schemaItems: vscode.CompletionItem[] = []
    private tableItems: vscode.CompletionItem[] = []
    private service: DatabaseService

    constructor(service: DatabaseService) {
        this.service = service
    }

    updateSchemas() {
        // let result = []
        // this.service.getSchemaNodes().forEach((schema) => {
        //     this.schemaItems.push(new vscode.CompletionItem(schema.name, CompletionItemKind.Module))
        //     schema.typeNodes.forEach((type) => {
        //         result = result.concat(type.objects.forEach((obj) => {
        //             let item = new vscode.CompletionItem(obj.name, CompletionItemKind.Class)
        //             item.detail = obj.owner.catalog ? obj.owner.catalog : obj.owner.schema
        //             if (type.name === 'table') {
        //                 this.tableItems.push(item)
        //             }
        //         }))
        //     })
        // })
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
        let sql = trimSql(document.getText(range))
        // Calculate the caret position's character offset relative to this block of SQL (0 based)
        let caretOffset = document.offsetAt(position) - document.offsetAt(range.start)
        return this.getCompletionItems(sql, caretOffset)
    }

    private async getCompletionItems(sql: string, caretOffset: number) {
        let item = await this.service.parse(sql, caretOffset)
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

    /**
     * We expect SQL statements to be separated by a ';' or an empty line, this is the easiest way to pick them out
     * as you are typing.  This method figures out where the sql statement starts and ends based on those assumptions
     * @param position The current cursor position
     * @param document The document you are editing
     */
    private getSqlRange(position: vscode.Position, document: vscode.TextDocument) : vscode.Range {
        // Search forwards for empty line, semicolon line ending or end of document
        let endLine
        for (endLine = position.line; endLine < document.lineCount-1; endLine++) {
            if (!document.lineAt(endLine+1).text) break
            if (document.lineAt(endLine).text.endsWith(';')) break
        }
        // Search backwards for empty line, semicolon or beginning of document
        let startLine
        for (startLine = position.line; startLine > 0; startLine--) {
            if (!document.lineAt(startLine-1).text) break
            if (document.lineAt(startLine-1).text.endsWith(';')) break
        }
        let start = new vscode.Position(startLine, 0)
        let end = new vscode.Position(endLine, document.lineAt(endLine).text.length)
        return new vscode.Range(start, end)
    }

    private async getColumnItems(item: any): Promise<vscode.CompletionItem[]> {
        let tableItem = {owner: '', name: ''}
        if (!item.tableAlias) {
            for (var key in item.tableMap) {
                tableItem = item.tableMap[key]
                break
            }
        } else {
            tableItem = item.tableMap[item.tableAlias]
        }
        let described = await this.service.describeByName(tableItem.owner, tableItem.name)
        let tableData = described.resolved as TableData
        return tableData.columns.map((c) => {
            let ci = new vscode.CompletionItem(c.name, vscode.CompletionItemKind.Field)
            ci.detail = described.name
            return ci
        })
    }

    private getTableItems(item: any) : vscode.CompletionItem[] {
        return []
    }

}