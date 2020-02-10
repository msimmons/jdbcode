'use strict'

import * as vscode from 'vscode'
import { DatabaseService } from "./database_service"
import { StatusBarItem } from "vscode";
import { DatabaseTreeProvider } from "./database_tree_provider";
import { SchemaContentProvider } from "./schema_content_provider";
import { CompletionProvider } from "./completion_provider";
import { ResultSetWebview } from './resultset_webview';
import { ObjectNode } from './models';
import { ObjectOwner, ConnectionData, DriverData, SqlStatement } from 'server-models';
import { SchemaWebview } from './schema_webview';

let makeUUID = require('node-uuid').v4;

const ADD_DRIVER_CHOICE = '+ Add Driver'
const ADD_CONNECTION_CHOICE = '+ Add Connection'
const CLOSE_CHOICE = '+ Close'

export class DatabaseController {

    private statusBarItem: StatusBarItem
    private schemaTreeProvider: DatabaseTreeProvider
    private schemaContentProvider: SchemaContentProvider
    private completionProvider: CompletionProvider
    private resultSetPanels: ResultSetWebview[] = []
    private schemaPanels: SchemaWebview[] = []
    private docCount = 0

    private service: DatabaseService
    private context: vscode.ExtensionContext

    constructor(context: vscode.ExtensionContext, service: DatabaseService) {
        this.service = service
        this.context = context
    }

    start() {
        this.createStatusBar()
        this.registerProviders()
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
    }

    async connect(connection: ConnectionData, driver: DriverData, command?: string) {
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
                    vscode.commands.executeCommand(command)
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
    async chooseAndConnect(command?: string) {
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
                this.connect(connection, driver, command)
            }
        })
    }

    /**
     * Execute the currently selected SQL and open web view for results
     * suppressTxn defaults to false which will honor the global 'autocommit' setting.  Setting it to true
     * will set autocommit to true regardless of global setting
     */
    async executeSql(suppressTxn: boolean = false) {
        let editor = vscode.window.activeTextEditor
        if (!editor) return
        let sql = editor.document.getText(editor.selection)
        if (!sql) {
            let selection = this.getSqlRange(editor.selection.start, editor.document)
            sql = editor.document.getText(selection)
            if (!sql) return
        }
        if (!this.service.getConnection()) {
            let command = suppressTxn ? "jdbcode.execute-autocommit" : "jdbcode.execute"
            this.chooseAndConnect(command)
            return
        }
        let queryId: string = makeUUID()
        let sqlStatement: SqlStatement = {
            id: queryId,
            connection: this.service.getConnection().name,
            sql: this.trimSql(sql),
            suppressTxn: suppressTxn
        }
        /**
         * Open the query result UI and execute the query updating the UI with the results
         */
        let panel = new ResultSetWebview(this.context, this.service)
        panel.create(sqlStatement, ++this.docCount)
        this.resultSetPanels.push(panel)
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
                    items = items.concat(tt.objects.map((o) => {
                        let ownerString = this.getOwnerString(o.data.owner)
                        return { label: `${ownerString}.${o.data.name}`, description: o.data.type, item: o }
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
        let docName = this.getOwnerString(node.data.owner) + '.' + node.data.name + ' (' + node.data.type + ')'
        panel.create(node, docName)
        this.schemaPanels.push(panel)
    }

    /**
     * Disconnect from the current connection if any
     */
    async disconnect() {
        vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: "Disconnecting" }, async (progress) => {
            progress.report({ message: `Disconnecting  ${this.service.getConnection().name}` })
            this.resultSetPanels.forEach(panel => { panel.close() })
            this.resultSetPanels = []
            this.schemaPanels.forEach(panel => { panel.close() })
            this.schemaPanels = []
            this.schemaTreeProvider.clear()
            this.statusBarItem.text = '$(database)'
            // Tell server to disconnect (close current statements and connections)
            try {
                await this.service.disconnect()
                vscode.commands.executeCommand('setContext', 'jdbcode.context.isConnected', false)
            }
            catch (err) {
                vscode.window.showErrorMessage('Error closing connection: ' + err)
            }
        })
    }

    private getOwnerString(owner: ObjectOwner) {
        return owner.catalog ? owner.catalog : owner.schema
    }

    private trimSql(sql: string) : string {
        sql = sql.trim()
        if (sql.charAt(sql.length-1) === ';') return sql.slice(0, sql.length-1)
        else return sql
    }

    /**
     * We expect SQL statements to be separated by configured delimiters (eg. ';') or an empty line; this is the easiest way to pick them out
     * as you are typing.  This method figures out where the sql statement starts and ends based on those assumptions
     * 
     * @param position The current cursor position
     * @param document The document you are editing
     */
    getSqlRange(position: vscode.Position, document: vscode.TextDocument) : vscode.Range {
        // Search forwards for empty line, semicolon line ending or end of document
        let endLine
        for (endLine = position.line; endLine < document.lineCount-1; endLine++) {
            if (!document.lineAt(endLine+1).text) break
            if (document.lineAt(endLine).text.endsWith(';')) break
        }
        // Search backwards for empty line, semicolon or beginning of document
        let startLine
        for (startLine = position.line; startLine > 0; startLine--) {
            if (!document.lineAt(startLine-1).text) break
            if (document.lineAt(startLine-1).text.endsWith(';')) break
        }
        let start = new vscode.Position(startLine, 0)
        let end = new vscode.Position(endLine, document.lineAt(endLine).text.length)
        return new vscode.Range(start, end)
    }
}