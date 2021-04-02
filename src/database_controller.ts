'use strict'

import * as vscode from 'vscode'
import { DatabaseService } from "./database_service"
import { StatusBarItem } from "vscode";
import { DatabaseTreeProvider } from "./database_tree_provider";
import { SchemaContentProvider } from "./schema_content_provider";
import { CompletionProvider } from "./completion_provider";
import { ResultSetWebview } from './resultset_webview';
import { ConnectionData, DriverData, ObjectNode, SqlStatement } from './models';
import { SchemaWebview } from './schema_webview';
import { CodeLensProvider } from './code_lens_provider';
import { SqlParser } from './sql_parser';

let makeUUID = require('node-uuid').v4;

const ADD_DRIVER_CHOICE = '+ Add Driver'
const ADD_CONNECTION_CHOICE = '+ Add Connection'
const CLOSE_CHOICE = '+ Close'

export class DatabaseController {

    private outputChannel: vscode.OutputChannel
    private statusBarItem: StatusBarItem
    private schemaTreeProvider: DatabaseTreeProvider
    private schemaContentProvider: SchemaContentProvider
    private completionProvider: CompletionProvider
    private codeLensProvider: CodeLensProvider
    private resultSetViews: ResultSetWebview[] = []
    private schemaViews: SchemaWebview[] = []
    private docCount = 0

    private service: DatabaseService
    private parser: SqlParser
    private context: vscode.ExtensionContext

    constructor(context: vscode.ExtensionContext) {
        this.context = context
    }

    start() {
        this.outputChannel = vscode.window.createOutputChannel("JDBCode")
        let config = this.getConfig()
        this.service = new DatabaseService(this.outputChannel, config.get<boolean>('debug'))
        this.parser = new SqlParser()
        this.createStatusBar()
        this.registerProviders()
    }

    private getConfig() : vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration("jdbcode")
    }

    private createStatusBar() {
        if (this.statusBarItem) return
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10)
        this.statusBarItem.command = 'jdbcode.connect'
        this.statusBarItem.tooltip = 'Choose Database Connection'
        this.statusBarItem.text = '$(database)'
        this.statusBarItem.show()
        this.context.subscriptions.push(this.statusBarItem)
    }

    private registerProviders() {
        this.completionProvider = new CompletionProvider(this.service)
        vscode.languages.registerCompletionItemProvider('sql', this.completionProvider, ".")
        this.schemaContentProvider = new SchemaContentProvider(this.context)
        vscode.workspace.registerTextDocumentContentProvider(this.schemaContentProvider.scheme, this.schemaContentProvider)
        this.schemaTreeProvider = new DatabaseTreeProvider(this.service)
        vscode.window.registerTreeDataProvider(this.schemaTreeProvider.viewId, this.schemaTreeProvider)
        this.codeLensProvider = new CodeLensProvider()
        vscode.languages.registerCodeLensProvider('sql', this.codeLensProvider)
    }

    async connect(connection: ConnectionData, driver: DriverData, command?: string, commandArgs?: any[]) {
        // Disconnect first if necessary
        await this.disconnect()
        // Send connection info to server, it will create connection pool if it doesn't already exist
        vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: "Connect to DB" }, async (progress) => {
            progress.report({ message: 'Connecting to ' + connection.name })
            try {
                await this.service.connect(connection, driver)
                this.schemaTreeProvider.clear()
                this.completionProvider.updateSchemas()
                this.statusBarItem.text = '$(database) ' + connection.name
                vscode.commands.executeCommand('setContext', 'jdbcode.context.isConnected', true)
                if (command) {
                    vscode.commands.executeCommand(command, ...(commandArgs ? commandArgs : []))
                }
            }
            catch (error) {
                progress.report({ message: 'Failed to connect!' })
                vscode.window.showErrorMessage('Error connecting: ' + error.message)
            }
        })
    }

    /**
     * Refresh the current connection (reload the schemas etc)
     */
    async refresh() {
        vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: "Refreshing DB" }, async (progress) => {
            progress.report({ message: `Refreshing  ${this.service.getConnection().name}` })
            try {
                await this.service.refresh()
                this.schemaTreeProvider.clear()
            }
            catch (error) {
                progress.report({ message: 'Failed to refresh!' })
                vscode.window.showErrorMessage('Error refreshing: ' + error.message)
            }
        })
    }

    /**
     * Let the user choose a connection to connect to and execute the optional
     * command after connecting
     */
    async chooseAndConnect(command?: string, commandArgs?: any[]) {
        let config = vscode.workspace.getConfiguration("jdbcode")
        let connections = config.get('connections') as ConnectionData[]
        let drivers = config.get('drivers') as DriverData[]
        let choices = [ADD_DRIVER_CHOICE, ADD_CONNECTION_CHOICE]
        if (this.service.getConnection()) choices.push(CLOSE_CHOICE + ': ' + this.service.getConnection().name)
        choices = choices.concat(connections.map((it) => { return it.name }))
        vscode.window.showQuickPick(choices, {}).then((choice) => {
            if (!choice) return
            else if (choice.startsWith(ADD_DRIVER_CHOICE)) vscode.commands.executeCommand('jdbcode.addDriver')
            else if (choice.startsWith(ADD_CONNECTION_CHOICE)) vscode.commands.executeCommand('jdbcode.addConnection')
            else if (choice.startsWith(CLOSE_CHOICE)) vscode.commands.executeCommand('jdbcode.disconnect')
            else {
                let connection = connections.find((it) => { return it.name === choice })
                if (!connection) return;
                let driver = drivers.find((it) => { return it.name === connection.driver })
                if (!driver) vscode.window.showErrorMessage('Could not find driver for connection ' + choice)
                this.connect(connection, driver, command, commandArgs)
            }
        })
    }

    /**
     * Execute the currently selected SQL and open web view for results
     * suppressTxn defaults to false which will honor the global 'autocommit' setting.  Setting it to true
     * will set autocommit to true regardless of global setting
     */
    async executeSql(suppressTxn: boolean = false, range?: vscode.Range) {
        let editor = vscode.window.activeTextEditor
        if (!editor) return
        let document = editor.document
        let sql = undefined
        // If we are passed a range, use it
        if (range) {
            let start = document.offsetAt(range.start)
            let end = document.offsetAt(range.end)
            sql = this.parser.findStatement(document.getText(), start, end)
        } else {
            // Otherwise look for a selection
            sql = document.getText(editor.selection)
        }
        // Otherwise, get the SQL at the current
        if (!sql) {
            let position = document.offsetAt(editor.selection.start)
            sql = this.parser.findStatement(document.getText(), position, position)
            if (!sql) return
        }
        if (!this.service.getConnection()) {
            let command = suppressTxn ? "jdbcode.execute-autocommit" : "jdbcode.execute"
            this.chooseAndConnect(command, [range])
            return
        }
        let queryId: string = makeUUID()
        let sqlStatement: SqlStatement = {
            id: queryId,
            connection: this.service.getConnection().name,
            sql: sql,
            suppressTxn: suppressTxn
        }
        /**
         * Open the query result UI and execute the query updating the UI with the results
         */
        let webview = new ResultSetWebview(this.context, this.service)
        webview.create(sqlStatement, ++this.docCount)
        this.resultSetViews.push(webview)
    }

    /**
     * Show a quick pick of all db objects so the user can find what they are looking for
     */
    async findObject() {
        let typeNodes = this.service.getSchemaNodes().map((s) => {
            return this.service.getSchemaObjects(s)
        })
        Promise.all(typeNodes).then((types) => {
            let items = []
            types.forEach((tn) => {
                tn.forEach(tt => {
                    items = items.concat(tt.objectNodes.map((node) => {
                        let ownerString = node.object.namespace
                        return { label: `${ownerString}.${node.object.name}`, description: tt.objectType, item: node }
                    }))
                })
            })
            vscode.window.showQuickPick(items).then((choice) => {
                if (!choice) return
                vscode.commands.executeCommand('jdbcode.describe', choice.item)
            })
        })
    }

    /**
     * Show a description of the given object 
     */
    async showDescribe(node: ObjectNode) {
        let panel = new SchemaWebview(this.context, this.service)
        let docName = `${node.object.namespace}.${node.object.name} (${node.objectType})`
        panel.create(node, docName)
        this.schemaViews.push(panel)
    }

    /**
     * Disconnect from the current connection if any
     */
    async disconnect() {
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: "Disconnecting" }, async (progress) => {
            if (this.service.getConnection()) {progress.report({ message: `Disconnecting  ${this.service.getConnection().name}` })}
            for (const view of this.resultSetViews) await view.close()
            this.resultSetViews = []
            for (const view of this.schemaViews) view.close()
            this.schemaViews = []
            this.schemaTreeProvider.clear()
            this.statusBarItem.text = '$(database)'
            try {
                await this.service.disconnect()
                vscode.commands.executeCommand('setContext', 'jdbcode.context.isConnected', false)
            }
            catch (err) {
                vscode.window.showErrorMessage('Error closing connection: ' + err)
            }
        })
    }
 
}