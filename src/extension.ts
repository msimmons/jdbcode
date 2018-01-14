'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {QuickPickOptions, StatusBarItem, StatusBarAlignment, Uri, ConfigurationTarget} from 'vscode'
import {ResultSetContentProvider} from './resultset_content_provider'
import { DatabaseTreeProvider } from './database_tree_provider'
import { CompletionProvider } from './completion_provider'
import { SqlStatement } from './models';

let makeUUID = require('node-uuid').v4;

let currentConnection : object
let statusBarItem : StatusBarItem
let resultProvider: ResultSetContentProvider
let schemaProvider: DatabaseTreeProvider
let completionProvider: CompletionProvider
let jvmcode: vscode.Extension<any>
let httpPort: number
let docCount = 0
const ADD_DRIVER_CHOICE = '+ Add Driver'
const ADD_CONNECTION_CHOICE = '+ Add Connection'
const CLOSE_CHOICE = '+ Close'

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
        completionProvider = new CompletionProvider()
        vscode.languages.registerCompletionItemProvider('sql', completionProvider)
    }

    /**
     * Add a new JDBC driver definition
     */
    let addDriver = vscode.commands.registerCommand('jdbcode.addDriver', () => {
        let config = vscode.workspace.getConfiguration("jdbcode")
        let drivers = config.get('drivers') as Array<object>
        vscode.window.showInputBox({placeHolder: 'A name for the driver'}).then((name) => {
            if ( !name ) return
            if ( drivers.find((d) => { return d['name'] === name }) ) {
                vscode.window.showErrorMessage('Driver ' + name + ' already exists')
                return
            }
            vscode.window.showInputBox({placeHolder: 'Path to jar file'}).then((jarFile) => {
                if ( !jarFile ) return
                vscode.window.showInputBox({placeHolder: 'Driver class name'}).then((driverClass) => {
                    if ( !driverClass ) return
                    drivers.push({name: name, jarFile: jarFile, driverClass: driverClass})
                    config.update('drivers', drivers, ConfigurationTarget.Global)
                })
            })
        })

    })

    /**
     * Add a new connection definition
     */
    let addConnection = vscode.commands.registerCommand('jdbcode.addConnection', () => {

    })

    /**
     * Open a connection to the given database defined by connection and driver configs
     */
    let connect = vscode.commands.registerCommand("jdbcode.connect", () => {
        let config = vscode.workspace.getConfiguration("jdbcode")
        let connections = config.get('connections') as Array<object>
        let drivers = config.get('drivers') as Array<object>
        let choices = [ADD_DRIVER_CHOICE, ADD_CONNECTION_CHOICE]
        if ( currentConnection ) choices.push(CLOSE_CHOICE + ': ' + currentConnection['name'])
        choices = choices.concat(connections.map((it) => {return it['name']}))
        vscode.window.showQuickPick(choices, {}).then((choice) => {
            if ( !choice ) return
            else if ( choice.startsWith(ADD_DRIVER_CHOICE) ) vscode.commands.executeCommand('jdbcode.addDriver')
            else if ( choice.startsWith(ADD_CONNECTION_CHOICE)) vscode.commands.executeCommand('jdbcode.addConnection')
            else if ( choice.startsWith(CLOSE_CHOICE)) vscode.commands.executeCommand('jdbcode.disconnect')
            else {
                let connection = connections.find((it) => {return it['name'] === choice})
                if ( !connection ) return;
                let driver = drivers.find((it) => {return it['name'] === connection['driver']})
                if ( !driver ) vscode.window.showErrorMessage('Could not find driver for connection ' + choice)
                doConnect(connection, driver)
            }
        })
    });

    function doConnect(connection: object, driver: object) {
        // Send connection info to server, it will create connection pool if it doesn't already exist
        jvmcode.exports.send('jdbcode.connect', {connection: connection, driver: driver}).then((reply) => {
            schemaProvider.setSchemas(connection, reply.body['schemas'])
            completionProvider.setKeywords(reply.body['keywords'])
            // Set connection as current connection
            currentConnection = connection
            statusBarItem.text = '$(database) '+currentConnection['name']
        }).catch((error) => {
            vscode.window.showErrorMessage('Error connecting: '+error.message)
        })
    }

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
        let queryId: string = makeUUID()
        let sqlStatement: SqlStatement = {
            id: queryId,
            connection: currentConnection['name'] as string,
            sql: sql,
            columns: [],
            rows: []
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
        resultProvider.clearResults()
        schemaProvider.clearSchemas()
        statusBarItem.text = '$(database)'
        if ( !currentConnection ) return
        // Tell server to disconnect (close current statements and connections)
        jvmcode.exports.send('jdbcode.disconnect', currentConnection).then((reply) => {
            currentConnection = null
            console.log('Closed connection')
        }).catch((err) => {
            console.error('Error closing: ' + err)
        })
    });

    /**
     * Re-execute the given query returning new results
     */
    let refresh = vscode.commands.registerCommand("jdbcode.refresh", (queryId) => {
        let uri = Uri.parse(resultProvider.scheme + '://' + queryId)
        resultProvider.update(uri, {id: queryId} as SqlStatement)
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
        resultProvider.update(uri, {id: queryId} as SqlStatement)
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
        resultProvider.update(uri, {id: queryId} as SqlStatement)
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
        resultProvider.update(uri, {id: queryId} as SqlStatement)
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
        resultProvider.close(uri)
        jvmcode.exports.send('jdbcode.close', {id: queryId}).then((reply) => {
        }).catch((error) => {
            vscode.window.showErrorMessage('Error closing statement: ' + error.message)
        })
    });

    /**
     * Export the statement results to CSV and stick them in a buffer
     */
    let exportCsv = vscode.commands.registerCommand("jdbcode.export-csv", (queryId) => {
        let resultSet = resultProvider.getResultSet(queryId)
        if ( !resultSet ) {
            vscode.window.showErrorMessage('No result set found for this query')
            return
        }
        let columns = resultSet.sqlStatement.columns.map((col) => {return '"'+col+'"'}).join(',')
        let rows = resultSet.sqlStatement.rows.map((row) => {
            return row.map((value) => {
                if ( typeof value === 'number' ) return value
                if ( typeof value === 'boolean' ) return value
                if ( typeof value === 'undefined' ) return ''
                if ( typeof value === 'object' ) return ''
                return '"' + value + '"'
            }).join(',')
        }).join('\n')
        let csv = columns + '\n' + rows
        vscode.workspace.openTextDocument({language: 'csv', content: csv}).then((doc) => {
            vscode.window.showTextDocument(doc)
        })
    });

    context.subscriptions.push(
        addDriver, addConnection, connect, execute, disconnect, 
        refresh, cancel, commit, rollback, close, exportCsv, statusBarItem
    );
}


// this method is called when your extension is deactivated
export function deactivate() {
    vscode.commands.executeCommand('jdbcode.disconnect')
}