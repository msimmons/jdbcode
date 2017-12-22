'use strict';

import * as vscode from 'vscode';
import { connect } from 'tls';
import { resolve } from 'path';
import { Uri } from 'vscode';
import { port } from '_debugger';

export class ResultSetContentProvider implements vscode.TextDocumentContentProvider {

	public scheme = 'jdbcode-result';

	private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    private subscriptions: vscode.Disposable;
    private resultSets = {}
    private context: vscode.ExtensionContext
    private port: number
    private sqlStatement: object

	public constructor(context: vscode.ExtensionContext) {
        this.context = context
		// Listen to the `closeTextDocument`-event which means we must
		// clear the corresponding model object - `ReferencesDocument`
		this.subscriptions = vscode.workspace.onDidCloseTextDocument(doc => this.clear(doc.uri))
	}

	dispose() {
		this.subscriptions.dispose();
        this.onDidChangeEmitter.dispose();
	}

	// Expose an event to signal changes of _virtual_ documents
	// to the editor
	get onDidChange() {
        console.log('on did change')
		return this.onDidChangeEmitter.event;
	}

	// Provider method that takes an uri of the `references`-scheme and
	// resolves its content by (1) running the reference search command
	// and (2) formatting the results
	provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {
        //let resultSet = this.resultSets.hasOwnProperty(uri.authority) ? this.resultSets[uri.authority] : null
        //let errorHtml = this.getErrorHtml(resultSet)
        //let columnHtml = this.getColumnHtml(resultSet)
        //let rowsHtml = this.getRowsHtml(resultSet)
        //let commitLink = encodeURI('command:jdbcode.commit?'+ JSON.stringify([uri.authority]))
        let timeNow = new Date().getTime();
        let html = `
        <html>
        <head>
            <script type="text/javascript">
                window.sessionStorage.setItem('foo', 'bar')
                window.localStorage.setItem('bar', 'baz')
                window.onload = function(event) {
                    console.log('reloaded results window at time ${timeNow}ms');
                    var doc = document.documentElement;
                    var url = "http://localhost:${this.port}/jdbcode/?sqlId=${this.sqlStatement['id']}"
                    document.getElementById('frame').src = url;
                };
            </script>
        </head>
        <body style="margin: 0; padding: 0; height: 100%; overflow: hidden;">
            <iframe id="frame" width="100%" height="100%" frameborder="0" style="position:absolute; left: 0; right: 0; bottom: 0; top: 0px;"/>
        </body>
        </html>
        `
         return html
         //return this.getVueHtml()
    }
    
    getScriptUri(fileName: string) : Uri {
        return vscode.Uri.file(this.context.asAbsolutePath('ui/dist/'+fileName))
    }

    update(uri, sqlStatement, resultSet, port) {
        this.resultSets[uri.authority] = resultSet
        this.onDidChangeEmitter.fire(uri);
        this.port = port
        this.sqlStatement = sqlStatement
    }

    clear(uri: Uri) {
        if ( this.resultSets.hasOwnProperty(uri.authority) ) {
            delete this.resultSets[uri.authority]
        }
    }

    private getColumnHtml(resultSet: object) : string {
        if ( !resultSet ) return '<tr><th>NA</th></tr>'
        let columns = resultSet['columns'] as Array<string>
        return '<tr><th>' + columns.join('</th><th>') + '</th></tr>'
    }

    private getRowsHtml(resultSet: object) : string {
        if ( !resultSet ) return '<tr><th>NA</th></tr>'
        let rows = resultSet['rows'] as Array<Array<any>>
        return '<tr>' + rows.map(row => {
            return '<td>' + row.join('</td><td>') + '</td>'
        }).join('</tr><tr>') + '</tr>'
    }

    private getErrorHtml(resultSet: object) : string {
        if ( !resultSet ) return ''
        if ( !resultSet.hasOwnProperty('error') ) return ''
        return '<p><b>'+resultSet['error']+'</b></p>'
    }

    private getVueHtml() {
        return `
        <html>
        <head>
          <meta charset="UTF-8">
          <title>CDN Example</title>
          <link href="http://unpkg.com/bootstrap@3.3.5/dist/css/bootstrap.min.css" rel="stylesheet">
          <link href="http://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet">
          <link href="http://unpkg.com/vue2-datatable-component/dist/min.css" rel="stylesheet">
        </head>
        <body>
        
          <div id="app"></div>
        
        <script src="http://unpkg.com/vue@2.4.4/dist/vue.min.js"></script>
        <script src="http://unpkg.com/jquery@2.1.4/dist/jquery.min.js"></script>
        <script src="http://unpkg.com/bootstrap@3.3.5/dist/js/bootstrap.min.js"></script>
        <script src="http://unpkg.com/vue2-datatable-component/dist/min.js"></script>
        <script>
          new Vue({
            el: '#app',
            template: [
              '<div class="container">',
                '<code>query: {{ query }}</code>',
                '<datatable v-bind="$data" />',
              '</div>>'
            ].join(''),
            data: function () {
              return {
                columns: [
                  { title: 'User ID', field: 'uid', sortable: true },
                  { title: 'Username', field: 'name' },
                  { title: 'Age', field: 'age', sortable: true },
                  { title: 'Email', field: 'email' },
                  { title: 'Country', field: 'country' }
                ],
                data: [{uid: '1', name:'2', email:'3', age:'4',country:'5'},{uid:'a',name:'b',email:'c',age:'d',country:'e'}], // no data
                total: 2,
                query: {}
              }
            }
          })
        </script>
        </body>
        </html>        
        `
    }
}