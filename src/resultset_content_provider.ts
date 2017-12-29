'use strict';

import * as vscode from 'vscode';
import { connect } from 'tls';
import { resolve } from 'path';
import { Uri } from 'vscode';
import { Event } from 'vscode';
import { TextDocument } from 'vscode';
import { port } from '_debugger';

export class ResultSetContentProvider implements vscode.TextDocumentContentProvider {

	public scheme = 'jdbcode-result';

	private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    private subscriptions: vscode.Disposable;
    private resultSets = {}
    private context: vscode.ExtensionContext

	public constructor(context: vscode.ExtensionContext) {
        this.context = context
		// Listen to the `closeTextDocument`-event which means we must
		// clear the corresponding model object - `ReferencesDocument`
        //this.subscriptions = vscode.workspace.onDidCloseTextDocument(doc => {this.closeDoc(doc)})
    }
    
    /**
     * Update the view based on the new sqlStatement
     * @param uri The uri to update
     * @param sqlStatement new sqlStatement to update with
     */
    update(uri, sqlStatement) {
        this.resultSets[uri.authority] = {sqlStatement: sqlStatement, html: this.getVueDataHtml(sqlStatement)}
        this.onDidChangeEmitter.fire(uri);
    }

    dispose() {
		this.subscriptions.dispose();
        this.onDidChangeEmitter.dispose();
        this.clearResults();
	}

    /**
     * Remove a single result from the result sets
     */
    close(queryId: string) {
        if ( this.resultSets.hasOwnProperty(queryId) ) {
            delete this.resultSets[queryId]
        }
    }

    /**
     * Get rid of all result sets
     */
    clearResults() {
        this.resultSets = {}
    }

	// Expose an event to signal changes of _virtual_ documents
	// to the editor
	get onDidChange() {
		return this.onDidChangeEmitter.event;
	}

	// Provider method that takes an uri of the `references`-scheme and
	// resolves its content by (1) running the reference search command
	// and (2) formatting the results
	provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {
        let resultSet = this.resultSets.hasOwnProperty(uri.authority) ? this.resultSets[uri.authority] : {}
        if ( !resultSet.hasOwnProperty('html') ) {
            resultSet['html'] = this.getVueDataHtml(resultSet['sqlStatement'])
        }
        return resultSet['html']
    }
    
    getScriptUri(fileName: string) : Uri {
        return vscode.Uri.file(this.context.asAbsolutePath('ui/'+fileName))
    }

    private getVueDataHtml(sqlStatement: object) : string {
        return `
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Result View</title>
            <link type="text/css" rel="stylesheet" href="${this.getScriptUri('dist/css/bootstrap.min.css')}" />
            <link type="text/css" rel="stylesheet" href="${this.getScriptUri('dist/css/bootstrap-vue.css')}" />
            <link type="text/css" rel="stylesheet" href="${this.getScriptUri('dist/css/font-awesome.min.css')}" />
            <style>
            .fa { font-size: 12px; }
            </style>
            <script src="${this.getScriptUri('dist/js/vue.min.js')}"></script>
            <script src="${this.getScriptUri('dist/js/polyfill.min.js')}"></script>
            <script src="${this.getScriptUri('dist/js/bootstrap-vue.js')}"></script>
            <script>
                window['sql-statement'] = ${JSON.stringify(sqlStatement)}
            </script>
        </head>
        <body>
            <div id="app"/>
            <script src="${this.getScriptUri('result-view.js')}"></script>
        </body>
        </html>
        `
    }

}