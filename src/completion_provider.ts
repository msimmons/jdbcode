import * as vscode from 'vscode'

export class CompletionProvider implements vscode.CompletionItemProvider {

    resolveCompletionItem?(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
        throw new Error("Method not implemented.");
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        // Parse from beginning to end of current sql statement and determine what is needed at the cursor
        let range = document.getWordRangeAtPosition(position)
        return [
            new vscode.CompletionItem('select', vscode.CompletionItemKind.Keyword),
            new vscode.CompletionItem('insert', vscode.CompletionItemKind.Keyword),
            new vscode.CompletionItem('update', vscode.CompletionItemKind.Keyword),
            new vscode.CompletionItem('delete', vscode.CompletionItemKind.Keyword),
        ]
    }
}