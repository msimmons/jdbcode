'use strict';

import * as vscode from 'vscode';
import { connect } from 'tls';
import { resolve } from 'path';
import { Uri } from 'vscode';
import { Event } from 'vscode';
import { TextDocument } from 'vscode';
import { SqlStatement } from './models'

export class ResultSetWebview {

    private context: vscode.ExtensionContext
    private jvmcode: vscode.Extension<any>
    private sqlStatement: SqlStatement
    private panel: vscode.WebviewPanel
    private hasPendingUpdate: boolean = false

	public constructor(context: vscode.ExtensionContext, jvmcode: vscode.Extension<any>) {
        this.context = context
        this.jvmcode = jvmcode
    }

    create (sqlStatement: SqlStatement, docNumber: number) {
        let docName = sqlStatement.connection + '-' + docNumber
        this.sqlStatement = sqlStatement
        this.panel = vscode.window.createWebviewPanel('jdbcode.resultset', docName, vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        })

        this.panel.onDidDispose(() => { this.disposed() }, null, this.context.subscriptions)

        this.panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'reexecute':
                    this.sqlStatement.status = 'executing'
                    this.reexecute()
                    break
                case 'cancel':
                    this.cancel()
                    break
                case 'commit':
                    this.commit()
                    break
                case 'rollback':
                    this.rollback()
                    break
                case 'close':
                    this.close()
                    break
                case 'export':
                    this.export()
                    break
            }
        }, null, this.context.subscriptions)

        this.panel.onDidChangeViewState(event => {
            this.pendingUpdate()
        }, null, this.context.subscriptions)

        this.panel.webview.html = this.getSlickDataHtml(sqlStatement)
        // Execute the statement
        this.panel.webview.postMessage(this.sqlStatement)
        this.execute()
    }

    private pendingUpdate () {
        if (this.hasPendingUpdate && this.panel.visible) {
            this.panel.webview.postMessage(this.sqlStatement)
            this.hasPendingUpdate = false
        }
    }

    private update (sqlStatement: SqlStatement) {
        this.sqlStatement = sqlStatement
        if (this.panel.visible) {
            this.panel.webview.postMessage(this.sqlStatement)
        } else {
            this.hasPendingUpdate = true
        }
    }

    private execute () {
        this.jvmcode.exports.send('jdbcode.execute', this.sqlStatement).then((reply) => {
            this.update(reply.body)
        }).catch((error) => {
            vscode.window.showErrorMessage('Error executing SQL: ' + error.message)
        })
    }

    private reexecute () {
        this.jvmcode.exports.send('jdbcode.reexecute', this.sqlStatement).then((reply) => {
            this.update(reply.body)
        }).catch((error) => {
            vscode.window.showErrorMessage('Error executing SQL: ' + error.message)
        })
    }

    private cancel () {
        this.jvmcode.exports.send('jdbcode.cancel', { id: this.sqlStatement.id }).then((reply) => {
            this.update(reply.body)
        }).catch((error) => {
            vscode.window.showErrorMessage('Error cancelling statement: ' + error.message)
        })
    }

    private commit () {
        this.jvmcode.exports.send('jdbcode.commit', { id: this.sqlStatement.id }).then((reply) => {
            this.update(reply.body)
        }).catch((error) => {
            vscode.window.showErrorMessage('Error committing transaction: ' + error.message)
        })
    }

    private rollback () {
        this.jvmcode.exports.send('jdbcode.rollback', { id: this.sqlStatement.id }).then((reply) => {
            this.update(reply.body)
        }).catch((error) => {
            vscode.window.showErrorMessage('Error rolling back transaction: ' + error.message)
        })
    }

    public close () {
        if (this.panel) {
            this.panel.dispose()
        }
    }

    private disposed () {
        this.jvmcode.exports.send('jdbcode.close', { id: this.sqlStatement.id }).then((reply) => {
        }).catch((error) => {
            vscode.window.showErrorMessage('Error closing statement: ' + error.message)
        })
        this.panel = null
        this.sqlStatement = null
        this.context = null
        this.jvmcode = null
    }

    private export () {
        let columns = this.sqlStatement.columns.map((col) => { return '"' + col + '"' }).join(',')
        let rows = this.sqlStatement.rows.map((row) => {
            return row.map((value) => {
                if (typeof value === 'number') return value
                if (typeof value === 'boolean') return value
                if (typeof value === 'undefined') return ''
                if (typeof value === 'object') return ''
                return '"' + value + '"'
            }).join(',')
        }).join('\n')
        let csv = columns + '\n' + rows
        vscode.workspace.openTextDocument({ language: 'csv', content: csv }).then((doc) => {
            vscode.window.showTextDocument(doc)
        })
    }

    getScriptUri(fileName: string) : Uri {
        let fileUri = vscode.Uri.file(this.context.asAbsolutePath('ui/'+fileName))
        return fileUri.with({scheme: 'vscode-resource'})
    }

    private getSlickDataHtml(sqlStatement: SqlStatement) : string {
        return `
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Result View</title>
            <link type="text/css" rel="stylesheet" href="${this.getScriptUri('dist/css/bootstrap.min.css')}" />
            <link type="text/css" rel="stylesheet" href="${this.getScriptUri('dist/css/bootstrap-vue.css')}" />
            <link type="text/css" rel="stylesheet" href="${this.getScriptUri('dist/css/font-awesome.min.css')}" />
            <link type="text/css" rel="stylesheet" href="${this.getScriptUri('dist/css/slick.grid.css')}" />
            <link type="text/css" rel="stylesheet" href="${this.getScriptUri('dist/css/jquery-ui.custom.min.css')}" />
            <link type="text/css" rel="stylesheet" href="${this.getScriptUri('main.css')}" />
            <script src="${this.getScriptUri('dist/js/jquery-1.11.2.min.js')}"></script>
            <script src="${this.getScriptUri('dist/js/jquery.event.drag-2.3.0.js')}"></script>
            <script src="${this.getScriptUri('dist/js/slick.core.js')}"></script>
            <script src="${this.getScriptUri('dist/js/slick.grid.js')}"></script>
            <script src="${this.getScriptUri('dist/js/vue.min.js')}"></script>
            <script src="${this.getScriptUri('dist/js/polyfill.min.js')}"></script>
            <script src="${this.getScriptUri('dist/js/bootstrap-vue.js')}"></script>
            <script>
                window['sql-statement'] = ${JSON.stringify(sqlStatement)}
            </script>
        </head>
        <body>
            <div id="result-control"/>
            <div id="result-grid"/>
            <script src="${this.getScriptUri('result-view-grid.js')}"></script>
        </body>
        </html>
        `
    }

}