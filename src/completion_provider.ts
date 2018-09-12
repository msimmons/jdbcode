import * as vscode from 'vscode'
import { CompletionItemKind } from 'vscode';
import { SchemaData, SchemaObject } from './models'
import { SqlParser } from './sql_parser'
import { ObjectSpec } from './sql_listener'
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
                    if ( type.name === 'table' ) {
                        this.tableItems.push(item)
                    }
                }))
            })
        })
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
        document.getText()
        console.log(position)
        // Parse from beginning to end (for now end of line)
        /*
        let parser = new SqlParser()
        let result = parser.parse(sql, position)
        console.log(result)
        // Find the type of thing needed at position
        if ( result.type === 'owner' ) return this.schemaItems
        if ( result.type === 'table_list' ) return this.schemaItems.concat(this.tableItems)
        if ( result.type === 'table' ) return this.tableItems
        if ( result.type === 'alias' ) return result.values.map((value) => { return new vscode.CompletionItem(value, vscode.CompletionItemKind.Field)})
        if ( result.type === 'column_list' ) return result.values.map((value) => { return new vscode.CompletionItem(value, vscode.CompletionItemKind.Field)})
        if ( result.type === 'column' ) return this.getColumnItems(result)
        */
       return []
    }

    private getColumnItems(spec: ObjectSpec) : Promise<vscode.CompletionItem[]> {
        let obj = new SchemaObject()
        obj.owner = spec.owner
        obj.name = spec.name
        obj.type = 'table'
        let described = doDescribe(obj)
        return new Promise<vscode.CompletionItem[]>((resolve, reject) => {
            described.then((reply) => {
                resolve(reply.columns.map((column) =>{ return new vscode.CompletionItem(column, vscode.CompletionItemKind.Field)}))
            }).catch((error) => {
                console.log(error.message)
                resolve([])
            })
        })
    }
    
}