'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {QuickPickOptions, StatusBarItem, StatusBarAlignment, Uri} from 'vscode'
import {ResultSetContentProvider} from './resultset_content_provider'
import { DatabaseTreeProvider } from './database_tree_provider';

let makeUUID = require('node-uuid').v4;

let currentConnection : object
let statusBarItem : StatusBarItem
let resultProvider: ResultSetContentProvider
let schemaProvider: DatabaseTreeProvider
let jvmcode: vscode.Extension<any>
let httpPort: number
let docCount = 0

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    jvmcode = vscode.extensions.getExtension('contrapt.jvmcode')

    installVerticle()

    function installVerticle() {
        let jarFile = context.asAbsolutePath('jdbcode.jar')
        let config = vscode.workspace.getConfiguration("jdbcode")
        let drivers = config.get('drivers') as Array<object>
        let jarFiles = drivers.map((it) => { return it['jarFile']}).concat(jarFile)
        jvmcode.exports.install(jarFiles, 'net.contrapt.jdbcode.JDBCVerticle').then((result) => {
            startServer()
            createStatusBar()
            registerProviders()
        })
    }

    function startServer() {
        let webRoot = context.asAbsolutePath('ui/dist')
        console.log('Start server at '+webRoot)
        jvmcode.exports.serve('/jdbcode/*', webRoot).then((reply) => {
            httpPort = reply.body['port']
        }).catch((err) => {
            vscode.window.showErrorMessage('Failed to start content server: '+err.message)
        })
    }

    function createStatusBar() {
        if ( statusBarItem ) return
        statusBarItem = vscode.window.createStatusBarItem(StatusBarAlignment.Left, 10)
        statusBarItem.command = 'jdbcode.connect'
        statusBarItem.tooltip = 'Choose Database Connection'
        statusBarItem.text = '$(database)'
        statusBarItem.show()
        context.subscriptions.push(statusBarItem)
    }

    function registerProviders() {
        resultProvider = new ResultSetContentProvider(context)
        vscode.workspace.registerTextDocumentContentProvider(resultProvider.scheme, resultProvider)
        schemaProvider = new DatabaseTreeProvider()
        vscode.window.registerTreeDataProvider(schemaProvider.viewId, schemaProvider)
    }

    /**
     * Open a connection to the given database defined by connection and driver configs
     */
    let connect = vscode.commands.registerCommand("jdbcode.connect", () => {
        let config = vscode.workspace.getConfiguration("jdbcode")
        let connections = config.get('connections') as Array<object>
        let drivers = config.get('drivers') as Array<object>
        let choices = ['+ Create New Connection']
        if ( currentConnection ) choices.push('+ Disconnect '+currentConnection['name'])
        choices = choices.concat(connections.map((it) => {return it['name']}))
        vscode.window.showQuickPick(choices, {}).then((choice) => {
            let connection = connections.find((it) => {return it['name'] === choice})
            if ( !connection ) return;
            let driver = drivers.find((it) => {return it['name'] === connection['driver']})
            // Send connection info to server, it will create connection pool if it doesn't already exist
            jvmcode.exports.send('jdbcode.connect', {connection: connection, driver: driver}).then((reply) => {
                schemaProvider.setSchemas(connection, reply.body['schemas'])
                // Set connection as current connection
                currentConnection = connection
                statusBarItem.text = '$(database) '+currentConnection['name']
            }).catch((error) => {
                vscode.window.showErrorMessage('Error connecting: '+error.message)
            })
        })
    });

    /**
     * Execute the currently selected SQL statement on the current connection
     */
    let execute = vscode.commands.registerCommand("jdbcode.execute", () => {
        let editor = vscode.window.activeTextEditor
        if ( !editor ) return
        let sql = editor.document.getText(editor.selection)
        if ( !sql ) return
        if ( !currentConnection ) {
            vscode.window.showWarningMessage('Choose a db connection first')
            return
        }
        let queryId = makeUUID()
        let sqlStatement = {
            id: queryId,
            connection: currentConnection['name'],
            sql: sql
        }
        /**
         * Open the query result UI and execute the query updating the UI with the results
         */
        let uri = Uri.parse(resultProvider.scheme + '://' + queryId)
        resultProvider.update(uri, sqlStatement)
        let docName = currentConnection['name'] + '-' + (++docCount)
        vscode.commands.executeCommand('vscode.previewHtml', uri, vscode.ViewColumn.One, docName).then((success) => {
            jvmcode.exports.send('jdbcode.execute', sqlStatement).then((reply) => {
                resultProvider.update(uri, reply.body)
            }).catch((error) => {
                vscode.window.showErrorMessage('Error executing SQL: ' + error.message)
            })
        })
    });

    /**
     * Disconnect from current connection, closing all statements etc
     */
    let disconnect = vscode.commands.registerCommand("jdbcode.disconnect", () => {
        // Tell server to disconnect (close current statements and connections)
        jvmcode.exports.send('jdbcode.disconnect', currentConnection).then((reply) => {
            console.log('Closed connection')
        }).catch((err) => {
            console.error('Error closing: ' + err)
        })
        resultProvider.clearResults()
        schemaProvider.clearSchemas()
        currentConnection = null
        statusBarItem.text = '$(database)'
    });

    /**
     * Re-execute the given query returning new results
     */
    let refresh = vscode.commands.registerCommand("jdbcode.refresh", (queryId) => {
        let uri = Uri.parse(resultProvider.scheme + '://' + queryId)
        resultProvider.update(uri, {id: queryId})
        jvmcode.exports.send('jdbcode.refresh', {id: queryId}).then((reply) => {
            resultProvider.update(uri, reply.body)
        }).catch((error) => {
            vscode.window.showErrorMessage('Error refreshing results: ' + error.message)
        })
    });

    /**
     * Cancel a currently running statement
     */
    let cancel = vscode.commands.registerCommand("jdbcode.cancel", (queryId) => {
        let uri = Uri.parse(resultProvider.scheme + '://' + queryId)
        resultProvider.update(uri, {id: queryId})
        jvmcode.exports.send('jdbcode.cancel', {id: queryId}).then((reply) => {
            resultProvider.update(uri, reply.body)
        }).catch((error) => {
            vscode.window.showErrorMessage('Error cancelling statement: ' + error.message)
        })
    });

    /**
     * Commit updates on this statement
     */
    let commit = vscode.commands.registerCommand("jdbcode.commit", (queryId) => {
        let uri = Uri.parse(resultProvider.scheme + '://' + queryId)
        resultProvider.update(uri, {id: queryId})
        jvmcode.exports.send('jdbcode.commit', {id: queryId}).then((reply) => {
            resultProvider.update(uri, reply.body)
        }).catch((error) => {
            vscode.window.showErrorMessage('Error committing transaction: ' + error.message)
        })
    });

    /**
     * Rollback updates on this statement
     */
    let rollback = vscode.commands.registerCommand("jdbcode.rollback", (queryId) => {
        let uri = Uri.parse(resultProvider.scheme + '://' + queryId)
        resultProvider.update(uri, {id: queryId})
        jvmcode.exports.send('jdbcode.rollback', {id: queryId}).then((reply) => {
            resultProvider.update(uri, reply.body)
        }).catch((error) => {
            vscode.window.showErrorMessage('Error rolling back transaction: ' + error.message)
        })
    });

    /**
     * Close this statement
     */
    let close = vscode.commands.registerCommand("jdbcode.close", (queryId) => {
        let uri = Uri.parse(resultProvider.scheme + '://' + queryId)
        resultProvider.close(queryId)
        jvmcode.exports.send('jdbcode.close', {id: queryId}).then((reply) => {
        }).catch((error) => {
            vscode.window.showErrorMessage('Error closing statement: ' + error.message)
        })
    });

    /**
     * Export the statement results to CSV and stick them in a buffer
     */
    let exportCsv = vscode.commands.registerCommand("jdbcode.export-csv", (queryId) => {
        console.log('Exporting ' + queryId)
    });

    context.subscriptions.push(connect, execute, disconnect, refresh, cancel, commit, rollback, close, exportCsv, statusBarItem);
}


// this method is called when your extension is deactivated
export function deactivate() {
    console.log('Closing all the things')
}