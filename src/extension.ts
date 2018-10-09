'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { StatusBarItem, StatusBarAlignment, Uri, ConfigurationTarget, ProgressLocation } from 'vscode'
import { SchemaContentProvider } from './schema_content_provider'
import { DatabaseTreeProvider } from './database_tree_provider'
import { CompletionProvider } from './completion_provider'
import { SqlStatement, SchemaData, SchemaObject } from './models'
import { ResultSetWebview } from './resultset_webview'

let makeUUID = require('node-uuid').v4;

let currentConnection: object
let schemas: SchemaData[]
let schemaObjects: SchemaObject[]
let statusBarItem: StatusBarItem
let schemaProvider: DatabaseTreeProvider
let schemaContentProvider: SchemaContentProvider
let completionProvider: CompletionProvider
let jvmcode: any
let docCount = 0
let resultSetPanels: ResultSetWebview[] = []

const ADD_DRIVER_CHOICE = '+ Add Driver'
const ADD_CONNECTION_CHOICE = '+ Add Connection'
const CLOSE_CHOICE = '+ Close'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Get the exported API from jvmcode extension
    jvmcode = vscode.extensions.getExtension('contrapt.jvmcode').exports

    installVerticle()

    function installVerticle() {
        let jarFile = context.asAbsolutePath('jdbcode.jar')
        let config = vscode.workspace.getConfiguration("jdbcode")
        let drivers = config.get('drivers') as Array<object>
        let jarFiles = drivers.map((it) => { return it['jarFile'] }).concat(jarFile)
        jvmcode.install(jarFiles, 'net.contrapt.jdbcode.JDBCVerticle').then((result) => {
            createStatusBar()
            registerProviders()
        })
    }

    function createStatusBar() {
        if (statusBarItem) return
        statusBarItem = vscode.window.createStatusBarItem(StatusBarAlignment.Left, 10)
        statusBarItem.command = 'jdbcode.connect'
        statusBarItem.tooltip = 'Choose Database Connection'
        statusBarItem.text = '$(database)'
        statusBarItem.show()
        context.subscriptions.push(statusBarItem)
    }

    function registerProviders() {
        completionProvider = new CompletionProvider()
        vscode.languages.registerCompletionItemProvider('sql', completionProvider)
        schemaContentProvider = new SchemaContentProvider(context)
        vscode.workspace.registerTextDocumentContentProvider(schemaContentProvider.scheme, schemaContentProvider)
        schemaProvider = new DatabaseTreeProvider()
        vscode.window.registerTreeDataProvider(schemaProvider.viewId, schemaProvider)
    }

    /**
     * Add a new JDBC driver definition
     */
    let addDriver = vscode.commands.registerCommand('jdbcode.addDriver', () => {
        let config = vscode.workspace.getConfiguration("jdbcode")
        let drivers = config.get('drivers') as Array<object>
        vscode.window.showOpenDialog({filters: {'Driver Jar': ['jar']}, canSelectMany: false}).then((jarFile) => {
            if (!jarFile || jarFile.length == 0) return
            vscode.window.showInputBox({ placeHolder: 'A name for the driver' }).then((name) => {
                if (!name) return
                if (drivers.find((d) => { return d['name'] === name })) {
                    vscode.window.showErrorMessage('Driver ' + name + ' already exists')
                    return
                }
                vscode.window.showInputBox({ placeHolder: 'Driver class name' }).then((driverClass) => {
                    if (!driverClass) return
                    drivers.push({ name: name, jarFile: jarFile[0]['path'], driverClass: driverClass })
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
        doChoose()
    });

    /**
     * Let the user choose a connection
     * 
     * @param command An optional command passed to doConnect and executed on successful connection
     */
    function doChoose(command?: string) {
        let config = vscode.workspace.getConfiguration("jdbcode")
        let connections = config.get('connections') as Array<object>
        let drivers = config.get('drivers') as Array<object>
        let choices = [ADD_DRIVER_CHOICE, ADD_CONNECTION_CHOICE]
        if (currentConnection) choices.push(CLOSE_CHOICE + ': ' + currentConnection['name'])
        choices = choices.concat(connections.map((it) => { return it['name'] }))
        vscode.window.showQuickPick(choices, {}).then((choice) => {
            if (!choice) return
            else if (choice.startsWith(ADD_DRIVER_CHOICE)) vscode.commands.executeCommand('jdbcode.addDriver')
            else if (choice.startsWith(ADD_CONNECTION_CHOICE)) vscode.commands.executeCommand('jdbcode.addConnection')
            else if (choice.startsWith(CLOSE_CHOICE)) vscode.commands.executeCommand('jdbcode.disconnect')
            else {
                let connection = connections.find((it) => { return it['name'] === choice })
                if (!connection) return;
                let driver = drivers.find((it) => { return it['name'] === connection['driver'] })
                if (!driver) vscode.window.showErrorMessage('Could not find driver for connection ' + choice)
                doConnect(connection, driver, command)
            }
        })
    }

    /**
     * Connect to database with the given config. optionally, execute the given command on success
     * @param connection The connection config
     * @param driver The driver config
     * @param command optional command name to execute on connection success
     */
    function doConnect(connection: object, driver: object, command?: string) {
        // Close any existing result sets (just in case)
        resultSetPanels.forEach((panel) => {
            panel.close()
        })
        resultSetPanels = []
        // Send connection info to server, it will create connection pool if it doesn't already exist
        vscode.window.withProgress({ location: ProgressLocation.Window, title: "Connect to DB" }, (progress) => {
            progress.report({ message: 'Connecting to ' + connection['name'] })
            return jvmcode.send('jdbcode.connect', { connection: connection, driver: driver }).then((reply) => {
                schemas = reply.body['schemas']
                schemaProvider.setSchemas(connection, schemas)
                completionProvider.setSchemas(schemas)
                completionProvider.setKeywords(reply.body['keywords'])
                // Set connection as current connection
                currentConnection = connection
                statusBarItem.text = '$(database) ' + currentConnection['name']
                vscode.commands.executeCommand('setContext', 'jdbcode.context.isConnected', true)
                if (command) {
                    vscode.commands.executeCommand(command)
                }
            }).catch((error) => {
                vscode.window.showErrorMessage('Error connecting: ' + error.message)
            })
        })
    }

    /**
     * Execute the currently selected SQL statement on the current connection.  If no current
     * connection is chosen, allow user to choose one.
     */
    let execute = vscode.commands.registerCommand("jdbcode.execute", () => {
        let editor = vscode.window.activeTextEditor
        if (!editor) return
        let sql = editor.document.getText(editor.selection)
        if (!sql) return
        if (!currentConnection) {
            doChoose("jdbcode.execute")
            return
        }
        let queryId: string = makeUUID()
        let sqlStatement: SqlStatement = {
            id: queryId,
            connection: currentConnection['name'] as string,
            sql: sql,
            columns: [],
            rows: [],
            status: 'executing'
        }
        /**
         * Open the query result UI and execute the query updating the UI with the results
         */
        let panel = new ResultSetWebview(context, jvmcode)
        panel.create(sqlStatement, ++docCount)
        resultSetPanels.push(panel)
    });

    /**
     * Disconnect from current connection, closing all statements etc
     */
    let disconnect = vscode.commands.registerCommand("jdbcode.disconnect", () => {
        schemas = []
        schemaObjects = null
        resultSetPanels.forEach(panel => { panel.close() })
        resultSetPanels = []
        schemaProvider.clearSchemas()
        statusBarItem.text = '$(database)'
        if (!currentConnection) return
        // Tell server to disconnect (close current statements and connections)
        jvmcode.send('jdbcode.disconnect', currentConnection).then((reply) => {
            currentConnection = null
            vscode.commands.executeCommand('setContext', 'jdbcode.context.isConnected', false)
            console.log('Closed connection')
        }).catch((err) => {
            console.error('Error closing: ' + err)
        })
    });

    /**
     * Refresh the database schema info for the current connection
     */
    let refresh = vscode.commands.registerCommand("jdbcode.refresh", (queryId) => {
        // Todo
    });

    /**
     * Show a quick pick of schemas objects and describe the object when picked
     */
    let findObject = vscode.commands.registerCommand("jdbcode.find", (dbObject) => {
        let items = getSchemaObjects().map((obj) => {
            return {label: `${obj.owner}.${obj.name}`, description: obj.type, item: obj}
        })
        vscode.window.showQuickPick(items).then((choice) => {
            if ( !choice ) return
            vscode.commands.executeCommand('jdbcode.describe', choice.item)
        })
    })

    function getSchemaObjects() : SchemaObject[] {
        if ( schemaObjects ) return schemaObjects
        schemaObjects = []
        schemas.forEach((schema) => {
            schema.object_types.forEach((type) => {
                schemaObjects = schemaObjects.concat(type.objects)
            })
        })
        return schemaObjects
    }

    /**
     * Show the description view of the given schema object
     */
    let describe = vscode.commands.registerCommand("jdbcode.describe", (dbObject) => {
        let docName = dbObject.owner+'.'+dbObject.name
        let uri = Uri.parse(schemaContentProvider.scheme + '://' + docName)
        jvmcode.send('jdbcode.describe', { connection: currentConnection, dbObject: dbObject }).then((reply) => {
            dbObject = reply.body
            vscode.commands.executeCommand('vscode.previewHtml', uri, vscode.ViewColumn.One, docName).then((success) => {
                schemaContentProvider.update(uri, dbObject)
            })
        }).catch((error) => {
            vscode.window.showErrorMessage('Error describing object: ' + error.message)
        })
    })

    context.subscriptions.push(
        addDriver, addConnection, connect, execute, disconnect,
        refresh, statusBarItem, describe, findObject
    );
}

export function doDescribe(dbObject: SchemaObject) : Promise<SchemaObject> {
    return new Promise<SchemaObject>((resolve, reject) => {
        if (!currentConnection) {
            reject({message: 'No database connection open'})
        } else {
           jvmcode.send('jdbcode.describe', { connection: currentConnection, dbObject: dbObject }).then((reply) => {
                resolve(reply.body)
            }).catch((error) => {
                reject(error)
            })
        }
    })
}

// this method is called when your extension is deactivated
export function deactivate() {
    vscode.commands.executeCommand('jdbcode.disconnect')
}