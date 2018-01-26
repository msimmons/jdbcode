import * as vscode from 'vscode'
import { CompletionItemKind } from 'vscode';
import { SchemaData } from './models'

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
        let range = document.getWordRangeAtPosition(position)
        console.log('provide completion '+document.getText(range))
        return this.keywords.concat(this.objects)
    }
}