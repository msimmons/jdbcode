'use strict';

import * as vscode from 'vscode';
import { connect } from 'tls';
import { resolve } from 'path';
import { Uri } from 'vscode';
import { Event } from 'vscode';
import { TextDocument } from 'vscode';
import { SchemaObject, ObjectDescription } from './models'

export class SchemaContentProvider implements vscode.TextDocumentContentProvider {

	public scheme = 'jdbcode-schema';

	private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    private subscriptions: vscode.Disposable;
    private descriptions = {}
    private context: vscode.ExtensionContext

	public constructor(context: vscode.ExtensionContext) {
        this.context = context
		// Listen to the `closeTextDocument`-event which means we must
		// clear the corresponding model object - `ReferencesDocument`
        //this.subscriptions = vscode.workspace.onDidCloseTextDocument(doc => {this.closeDoc(doc)})
    }
    
    /**
     * Update the view based on the given schema object
     * @param uri The uri to update
     * @param dbObject The object to view
     */
    update(uri: Uri, dbObject: SchemaObject) {
        this.descriptions[uri.authority] = {dbObject: dbObject, html: this.getSchemaHtml(dbObject)}
        this.onDidChangeEmitter.fire(uri);
    }

    dispose() {
		this.subscriptions.dispose();
        this.onDidChangeEmitter.dispose();
        this.clearDescriptions();
	}

    /**
     * Remove a single object
     */
    close(uri: Uri) {
        if ( this.descriptions.hasOwnProperty(uri.authority) ) {
            delete this.descriptions[uri.authority]
        }
        this.onDidChangeEmitter.fire(uri)
    }

    /**
     * Get rid of all objects
     */
    clearDescriptions() {
        this.descriptions = {}
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
        let description: ObjectDescription = this.descriptions.hasOwnProperty(uri.authority) ? this.descriptions[uri.authority] : {}
        if ( !description.html ) {
            description.html = this.getSchemaHtml(description.dbObject)
        }
        return description.html
    }
    
    getScriptUri(fileName: string) : Uri {
        return vscode.Uri.file(this.context.asAbsolutePath('ui/'+fileName))
    }

    private getSchemaHtml(dbObject: SchemaObject) : string {
        let view = dbObject ? `schema-${dbObject.type}-view.js` : ''
        let viewUri = this.getScriptUri(view)
        return `
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Result View</title>
            <link type="text/css" rel="stylesheet" href="${this.getScriptUri('dist/css/bootstrap.min.css')}" />
            <link type="text/css" rel="stylesheet" href="${this.getScriptUri('dist/css/font-awesome.min.css')}" />
            <link type="text/css" rel="stylesheet" href="${this.getScriptUri('main.css')}" />
            <script src="${this.getScriptUri('dist/js/vue.min.js')}"></script>
            <script>
                window['db-object'] = ${JSON.stringify(dbObject)}
            </script>
        </head>
        <body>
            <div id="app"/>
            <script src="${viewUri}"></script>
        </body>
        </html>
        `
    }

}