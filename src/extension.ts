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
            vscode.window.showErrorMessage('Failed to start content server: '+err)
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
        console.log(sql)
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
        jvmcode.exports.registerConsumer(queryId, (error, message) => {
            jvmcode.exports.send(message.replyAddress, sqlStatement)
        })
        let uri = Uri.parse(resultProvider.scheme + '://' + queryId)
        // Send the query to server to execute on current connection
        resultProvider.update(uri, sqlStatement, {}, httpPort)
        vscode.commands.executeCommand('vscode.previewHtml', uri, vscode.ViewColumn.Three, 'Statement-1').then((success) => {
        })
        
        // Open some UI element with feedback
        // jvmcode.exports.send('jdbcode.execute', sqlStatement).then((reply) => {
        //     resultProvider.update(uri, sqlStatement, reply.body, httpPort)
        // }).catch((error) => {
        //     vscode.window.showErrorMessage('Error executing SQL: ' + error)
        // })
    });

    let disconnect = vscode.commands.registerCommand("jdbcode.disconnect", () => {
        // Tell server to disconnect (close current statements and connections)
        jvmcode.exports.send('jdbcode.disconnect', {connection: currentConnection}).then((reply) => {
            console.log('Closed connection')
        }).catch((err) => {
            console.error('Error closing: ' + err)
        })
        // Close windows etc on client
        schemaProvider.clearSchemas()
        currentConnection = null
        statusBarItem.text = '$(database)'
    });

    let commit = vscode.commands.registerCommand("jdbcode.commit", (queryId) => {
        console.log('Committing ' + queryId)
    });

    context.subscriptions.push(connect, execute, disconnect, commit, statusBarItem);
}


// this method is called when your extension is deactivated
export function deactivate() {
    console.log('Closing all the things')
}