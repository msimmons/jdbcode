'use strict';

import * as vscode from 'vscode';
import { SqlStatement, SqlResult } from 'server-models'
import { DatabaseService } from './database_service';
import * as fs from 'fs'

export class ResultSetWebview {

    private context: vscode.ExtensionContext
    private service: DatabaseService
    private sqlStatement: SqlStatement
    private sqlResult: SqlResult
    private panel: vscode.WebviewPanel
    private hasPendingUpdate: boolean = false

    public constructor(context: vscode.ExtensionContext, service: DatabaseService) {
        this.context = context
        this.service = service
    }

    /**
     * Create default SqlResult until we get a real one
     */
    private createSqlResult(sqlStatement: SqlStatement) : SqlResult {
        return {
            id: sqlStatement.id,
            status: "executing",
            type: "query",
            columns: [],
            rows: [],
            executionCount: 0,
            executionTime: 0,
            fetchTime: 0,
            moreRows: false,
            updateCount: -1,
            error: undefined
        }
    }

    create(sqlStatement: SqlStatement, docNumber: number) {
        let docName = sqlStatement.connection + '-' + docNumber
        this.sqlStatement = sqlStatement
        this.sqlResult = this.createSqlResult(sqlStatement)
        this.panel = vscode.window.createWebviewPanel('jdbcode.resultset', docName, vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        })

        this.panel.onDidDispose(() => { this.disposed() }, null, this.context.subscriptions)

        this.panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'fetch':
                    this.fetch()
                    break;
                case 'reexecute':
                    this.sqlResult.status = 'executing'
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
                case 'export-all':
                    this.exportAll()
                    break
                }
        }, null, this.context.subscriptions)

        this.panel.onDidChangeViewState(event => {
            this.pendingUpdate()
        }, null, this.context.subscriptions)

        //this.panel.webview.html = this.getSlickDataHtml(sqlStatement)
        this.panel.webview.html = this.getResultHtml()

        // Execute the statement
        this.sendMessage()
        this.execute()
    }

    private sendMessage() {
        this.panel.webview.postMessage({statement: this.sqlStatement, result: this.sqlResult})
    }

    private pendingUpdate() {
        if (this.hasPendingUpdate && this.panel.visible) {
            this.sendMessage()
            this.hasPendingUpdate = false
        }
    }

    private update(sqlResult: SqlResult) {
        this.sqlResult = sqlResult
        if (this.panel.visible) {
            this.sendMessage()
        } else {
            this.hasPendingUpdate = true
        }
    }

    private async execute() {
        try {
            let result = await this.service.execute(this.sqlStatement)
            this.update(result)
        }
        catch (error) {
            vscode.window.showErrorMessage('Error executing SQL: ' + error.message)
        }
    }

    private async fetch() {
        try {
            let result = await this.service.fetch(this.sqlStatement.id)
            result.rows = this.sqlResult.rows.concat(result.rows)
            this.update(result)
        }
        catch (error) {
            vscode.window.showErrorMessage('Error executing SQL: ' + error.message)
        }
    }

    private async reexecute() {
        // Clear the rows so we aren't sending them back to server
        this.sqlResult.rows = []
        this.sqlResult.columns = []
        try {
            let result = await this.service.reexecute(this.sqlStatement.id)
            this.update(result)
        }
        catch (error) {
            vscode.window.showErrorMessage('Error executing SQL: ' + error.message)
        }
    }

    private async cancel() {
        try {
            let result = await this.service.cancel(this.sqlStatement.id)
            this.update(result)
        }
        catch(error) {
            vscode.window.showErrorMessage('Error cancelling statement: ' + error.message)
        }
    }

    private async commit() {
        try {
            let result = await this.service.commit(this.sqlStatement.id)
            this.update(result)
        }
        catch(error) {
            vscode.window.showErrorMessage('Error committing transaction: ' + error.message)
        }
    }

    private async rollback() {
        try {
            let result = await this.service.rollback(this.sqlStatement.id)
            this.update(result)
        }
        catch(error) {
            vscode.window.showErrorMessage('Error rolling back transaction: ' + error.message)
        }
    }

    public close() {
        if (this.panel) {
            this.panel.dispose()
        }
    }

    private disposed() {
        try {
            this.service.close(this.sqlStatement.id)
        }
        catch(error) {
            vscode.window.showErrorMessage('Error closing statement: ' + error.message)
        }
        this.panel = null
        this.sqlStatement = null
        this.context = null
        this.service = null
    }

    private getHeaderString(delimiter = ',') : string {
        return this.sqlResult.columns.map((col) => { return '"' + col + '"' }).join(delimiter)
    }

    private getRowStrings(rows: any[][], delimiter = ',') : string[] {
        return rows.map((row) => {
            return row.map((value) => {
                if (typeof value === 'number') return value
                if (typeof value === 'boolean') return value
                if (typeof value === 'undefined') return ''
                if (typeof value === 'object') return ''
                return '"' + value + '"'
            }).join(delimiter)
        })
    }
    
    private export() {
        let columns = this.getHeaderString()
        let rows = this.getRowStrings(this.sqlResult.rows).join('\n')
        let csv = columns + '\n' + rows
        vscode.workspace.openTextDocument({ language: 'csv', content: csv }).then((doc) => {
            vscode.window.showTextDocument(doc)
        })
    }

    private async exportAll() {
        let file = await vscode.window.showSaveDialog({})
        if (!file) return
        vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: "Exporting Data" }, async (progress) => {
            progress.report({message: `Exporting to ${file.path}`})
            let wout = fs.createWriteStream(file.path)
            wout.write(this.getHeaderString()+'\n')
            let rowStrings = this.getRowStrings(this.sqlResult.rows).join('\n')
            wout.write(rowStrings)
            try {
                let result = this.sqlResult
                while (result.moreRows) {
                    result = await this.service.fetch(result.id)
                    if (result.rows.length > 0) {
                        rowStrings = this.getRowStrings(result.rows).join('\n')
                        wout.write('\n' + rowStrings)
                    }
                }
                this.sqlResult.moreRows = false
                this.update(this.sqlResult)
            }
            catch (error) {
                progress.report({ message: 'Failed to fetch!'})
                vscode.window.showErrorMessage(`Error fetching: ${error.message}`)
                wout.write('\nAn Error occurred: '+error.message)
            }
            wout.end()
            wout.close()
        })
    }

    private getResultHtml() : string {
        let indexPath = this.context.asAbsolutePath('out/ui/index.html')
        let index = fs.readFileSync(indexPath).toString()
        let scriptUri = vscode.Uri.file(this.context.asAbsolutePath('out/ui/'))
        scriptUri = scriptUri.with({scheme: 'vscode-resource'})
        index = index.replace(/\.\//g, scriptUri.toString())
        index = index.replace('$VIEW', 'RESULT_VIEW')
        return index
    }

}