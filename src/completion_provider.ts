import * as vscode from 'vscode'
import { CompletionItemKind } from 'vscode';
import { trimSql } from './extension'
import { DatabaseService } from './database_service';
import { TableData, ColumnExpr, TableItem, SyntaxError, ValueExpr } from 'server-models';

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
        this.schemaItems = []
        this.tableItems = []
        this.service.getSchemaNodes().forEach((schema) => {
            let si = new vscode.CompletionItem(schema.data.name, CompletionItemKind.Module)
            si.sortText = `0:${schema.data.name}`
            this.schemaItems.push(si)
            schema.typeNodes.forEach((type) => {
                type.objects.forEach((obj) => {
                    let item = new vscode.CompletionItem(obj.data.name, CompletionItemKind.Class)
                    item.detail = obj.data.owner.catalog ? obj.data.owner.catalog : obj.data.owner.schema
                    item.sortText = `1:${obj.data.name}`
                    if (type.data.name === 'table' || type.data.name === 'view') {
                        this.tableItems.push(item)
                    }
                })
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
        let sql = trimSql(document.getText(range))
        // Calculate the caret position's character offset relative to this block of SQL (0 based)
        let caretOffset = document.offsetAt(position) - document.offsetAt(range.start)
        return this.getCompletionItems(sql, caretOffset, position)
    }

    private async getCompletionItems(sql: string, caretOffset: number, position: vscode.Position) {
        let item = await this.service.parse(sql, caretOffset) 
        switch (item.type) {
            case 'COLUMN_EXPR':
                return this.handleColumnExpr(item as ColumnExpr, position)
            case 'VALUE_EXPR':
                return this.handleValueExpr(item as ValueExpr, position)
            case 'TABLE_ITEM':
                return this.handleTableItem(item as TableItem, position)
            case 'SYNTAX_ERROR':
                return this.handleSyntaxError(item as SyntaxError, position)
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

    /**
     * Get all the columns for the given tables -- optionally also prepend the list of aliases
     * @param tableItems A list of TableItems to get columns from
     */
    private async getColumnItems(tableItems: TableItem[], aliases: string[] = []) : Promise<vscode.CompletionItem[]> {
        let described = tableItems.map(async ti => await this.service.describeByName(ti.owner, ti.name))
        let aliasItems = aliases.map(a => {
            let ai = new vscode.CompletionItem(a, vscode.CompletionItemKind.Class)
            ai.detail = 'Alias'
            ai.sortText = `0:${ai.label}`
            return ai
        })
        return Promise.all(described).then(objectNodes => {
            let columnItems = []
            let tableData = objectNodes.filter(node => node).map(node => node.resolved as TableData)
            tableData.forEach(td => columnItems = columnItems.concat(td.columns.map(c => {
                let ci = new vscode.CompletionItem(c.name, vscode.CompletionItemKind.Field)
                ci.detail = td.name
                ci.sortText = `1:${td.name}.${ci.label}`
                return ci
            })))
            return aliasItems.concat(columnItems)
        })
    }

    /**
     * If tableMap is empty, show tables and complete with a "select * from <table>"
     * If no alias, show aliases and columns from all tables
     * If alias, show columns from the alias
     * 
     * @param item Expecting a column expression
     */
    private async handleColumnExpr(item: ColumnExpr, position: vscode.Position): Promise<vscode.CompletionItem[]> {
        let tableItems : TableItem[] = []
        let aliasNames = []
        // If no table alias
        if (!item.tableAlias) {
            for (var key in item.tableMap) {
                aliasNames.push(key)
                tableItems.push(item.tableMap[key])
            }
        }
        else {
            tableItems.push(item.tableMap[item.tableAlias])
        }
        if (tableItems.length === 0) return this.tableItems
        return this.getColumnItems(tableItems, aliasNames)
    }

    /**
     * For ValueExpr (parts of where, order, other random clause) we will just return approprite lists of columns
     * @param item 
     */
    private async handleValueExpr(item: ValueExpr, position: vscode.Position): Promise<vscode.CompletionItem[]> {
        let tableItems : TableItem[] = []
        let aliasNames = []
        for (var key in item.tableMap) {
            aliasNames.push(key)
            tableItems.push(item.tableMap[key])
        }
        if (tableItems.length === 0) {
            return this.tableItems.map(ti => {
                let newItem = new vscode.CompletionItem(ti.label, ti.kind)
                newItem.insertText = `* from ${ti.label}`
                return newItem
            })
        } else {
            return this.getColumnItems(tableItems, aliasNames)
        }
    }

    private async handleTableItem(item: TableItem, position: vscode.Position) : Promise<vscode.CompletionItem[]> {
        if (item.owner) {
            return this.tableItems.filter(ti => ti.detail === item.owner)
        }
        else {
            return this.schemaItems.concat(this.tableItems)
        }
    }

    private async handleSyntaxError(item: SyntaxError, position: vscode.Position) : Promise<vscode.CompletionItem[]> {
        return item.expected.map((it) => {return new vscode.CompletionItem(it)})
    }
}