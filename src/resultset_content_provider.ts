'use strict';

import * as vscode from 'vscode';
import { connect } from 'tls';
import { resolve } from 'path';
import { Uri } from 'vscode';
import { Event } from 'vscode';
import { TextDocument } from 'vscode';
import { ResultSet, SqlStatement } from './models'

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
    update(uri: Uri, sqlStatement: SqlStatement) {
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
    close(uri: Uri) {
        if ( this.resultSets.hasOwnProperty(uri.authority) ) {
            delete this.resultSets[uri.authority]
        }
        this.onDidChangeEmitter.fire(uri)
    }

    /**
     * Get rid of all result sets
     */
    clearResults() {
        this.resultSets = {}
    }

    /**
     * Get the results for the given queryId
     */
    getResultSet(queryId: string) : ResultSet {
        return this.resultSets[queryId]
    }

	/** Expose an event to signal changes of _virtual_ documents
	 * to the editor
     */
	get onDidChange() {
		return this.onDidChangeEmitter.event;
	}

    /**
     * Provide the html content for the given uri (queryId)
     * @param uri The uri to provider for
     */
	provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {
        let resultSet: ResultSet = this.resultSets.hasOwnProperty(uri.authority) ? this.resultSets[uri.authority] : {}
        if ( !resultSet.sqlStatement ) {
            return this.getNoStatementHtml()
        }
        if ( !resultSet.html ) {
            resultSet.html = this.getVueDataHtml(resultSet.sqlStatement)
        }
        return resultSet.html
    }
    
    getScriptUri(fileName: string) : Uri {
        return vscode.Uri.file(this.context.asAbsolutePath('ui/'+fileName))
    }

    private getNoStatementHtml() : string {
        return `
        <html>
        <head>
        <link type="text/css" rel="stylesheet" href="${this.getScriptUri('dist/css/bootstrap.min.css')}"/>
        <body>
          <div class="alert alert-warning" role="alert">The Statement has been closed</div>
        </body>
        </html>
        `
    }

    private getVueDataHtml(sqlStatement: SqlStatement) : string {
        return `
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Result View</title>
            <link type="text/css" rel="stylesheet" href="${this.getScriptUri('dist/css/bootstrap.min.css')}" />
            <link type="text/css" rel="stylesheet" href="${this.getScriptUri('dist/css/bootstrap-vue.css')}" />
            <link type="text/css" rel="stylesheet" href="${this.getScriptUri('dist/css/font-awesome.min.css')}" />
            <link type="text/css" rel="stylesheet" href="${this.getScriptUri('main.css')}" />
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