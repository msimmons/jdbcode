'use strict';

import * as vscode from 'vscode';
import { SqlStatement, SqlResult } from './models'
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

    create(sqlStatement: SqlStatement, docNumber: number) {
        let docName = sqlStatement.connection + '-' + docNumber
        this.sqlStatement = sqlStatement
        this.sqlResult = new SqlResult(sqlStatement.id)
        this.panel = vscode.window.createWebviewPanel('jdbcode.resultset', docName, vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        })

        this.panel.onDidDispose(async () => { await this.disposed() }, null, this.context.subscriptions)

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
                    this.sqlResult.status = 'executing'
                    this.exportAll()
                    break
                }
        }, null, this.context.subscriptions)

        this.panel.onDidChangeViewState(event => {
            this.pendingUpdate()
        }, null, this.context.subscriptions)

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

    /**
     * Transform row values as necessary for display
     * @param sqlResult 
     */
    private transformResult(sqlResult: SqlResult) : SqlResult {
        sqlResult.rows = (sqlResult.rows ? sqlResult.rows : []).map(row => {
            let rowObject = {}
            sqlResult.columns.forEach(col => {
                rowObject[col] = this.getRowValue(row[col])
            })
            return rowObject
        })
        return sqlResult
    }

    private update(sqlResult: SqlResult) {
        this.sqlResult = this.transformResult(sqlResult)
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
            vscode.window.showErrorMessage('Error fetching: ' + error.message)
        }
    }

    private async reexecute() {
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

    public async close() {
        await this.disposed()
        if (this.panel) {
            this.panel.dispose()
        }
    }

    private async disposed() {
        try {
            if (this.sqlStatement) await this.service.close(this.sqlStatement.id)
            this.sqlStatement = undefined
        }
        catch(error) {
            vscode.window.showErrorMessage('Error closing statement: ' + error.message)
        }
    }

    private getHeaderString(delimiter = ',') : string {
        return this.sqlResult.columns.map((col) => { return '"' + col + '"' }).join(delimiter)
    }

    private getRowValue(value: any, quoted?: boolean) : any {
        let wrapper = quoted ? '"' : ''
        if (typeof value === 'number') return value
        if (typeof value === 'boolean') return `${value}`
        if (!value) return ''
        if (value instanceof Date) return value.toISOString()
        if (typeof value === 'object') {
            let json = JSON.stringify(value)
            json = quoted ? json.replace(/"/g, "'") : json
            return `${wrapper}${json}${wrapper}`
        }
        return `${wrapper}${value}${wrapper}`
    }

    private getRowStrings(columns: string[], rows: any[], delimiter = ',') : string[] {
        return rows.map((row) => {
            return columns.map(col => {
                let value = row[col]
                return this.getRowValue(value, true)
            }).join(delimiter)
        })
    }
    
    private export() {
        let columns = this.getHeaderString()
        let rows = this.getRowStrings(this.sqlResult.columns, this.sqlResult.rows).join('\n')
        let csv = columns + '\n' + rows
        vscode.workspace.openTextDocument({ language: 'csv', content: csv }).then((doc) => {
            vscode.window.showTextDocument(doc)
        })
    }

    private async exportAll() {
        let file = await vscode.window.showSaveDialog({defaultUri: vscode.workspace.workspaceFolders[0].uri})
        if (!file) return
        vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: "Exporting Data" }, async (progress) => {
            this.sendMessage()
            progress.report({message: `Exporting to ${file.path}`})
            let wout = fs.createWriteStream(file.path)
            wout.write(this.getHeaderString()+'\n')
            let rowCount = this.sqlResult.rows.length
            let rowStrings = this.getRowStrings(this.sqlResult.columns, this.sqlResult.rows).join('\n')
            wout.write(rowStrings)
            try {
                let result = this.sqlResult
                while (result.moreRows) {
                    result = await this.service.fetch(result.id)
                    rowCount += result.rows.length
                    if (result.rows.length > 0) {
                        rowStrings = this.getRowStrings(this.sqlResult.columns, result.rows).join('\n')
                        wout.write('\n' + rowStrings)
                    }
                }
                this.sqlResult.moreRows = false
                this.sqlResult.status = 'executed'
                this.update(this.sqlResult)
            }
            catch (error) {
                progress.report({ message: 'Failed to fetch!'})
                vscode.window.showErrorMessage(`Error fetching: ${error.message}`)
                wout.write('\nAn Error occurred: '+error.message)
            }
            wout.end()
            wout.close()
            progress.report({message: `Finished exporting to ${file.path}`})
            vscode.window.showInformationMessage(`Exported ${rowCount} rows to ${file.path}`)
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