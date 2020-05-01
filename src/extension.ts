'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {  ConfigurationTarget } from 'vscode'
import { DatabaseController } from './database_controller';
import { DatabaseService } from './database_service';

let dbController: DatabaseController

export function activate(context: vscode.ExtensionContext) {

    let dbService = new DatabaseService(context)
    dbController = new DatabaseController(context, dbService)
    dbController.start()

    /**
     * Add a new JDBC driver definition
     */
    context.subscriptions.push(vscode.commands.registerCommand('jdbcode.addDriver', () => {
        let config = vscode.workspace.getConfiguration("jdbcode")
        let drivers = config.get('drivers') as Array<object>
        vscode.window.showOpenDialog({filters: {'Driver JS': ['js']}, canSelectMany: false}).then((jarFile) => {
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
    }))

    /**
     * Add a new connection definition
     */
    context.subscriptions.push(vscode.commands.registerCommand('jdbcode.addConnection', () => {

    }))

    /**
     * Allow user to choose a connection and then connect to it
     */
    context.subscriptions.push(vscode.commands.registerCommand("jdbcode.connect", () => {
        dbController.chooseAndConnect()
    }))

    /**
     * Execute the currently selected SQL statement on the current connection.  If no current
     * connection is chosen, allow user to choose one.
     */
    context.subscriptions.push(vscode.commands.registerCommand("jdbcode.execute", () => {
        dbController.executeSql()
    }))

    /**
     * Execute the currently selected SQL statement on the current connection without a transaction (autocommit=true).  If no current
     * connection is chosen, allow user to choose one.
     */
    context.subscriptions.push(vscode.commands.registerCommand("jdbcode.execute-autocommit", () => {
        dbController.executeSql(true)
    }))

    /**
     * Disconnect from current connection, closing all statements etc
     */
    context.subscriptions.push(vscode.commands.registerCommand("jdbcode.disconnect", () => {
        dbController.disconnect()
    }))

    /**
     * Refresh the database schema info for the current connection
     */
    context.subscriptions.push(vscode.commands.registerCommand("jdbcode.refresh", (queryId) => {
        dbController.refresh()
    }))

    /**
     * Show a quick pick of schemas objects and describe the object when picked
     */
    context.subscriptions.push(vscode.commands.registerCommand("jdbcode.find", () => {
        dbController.findObject()
    }))

    /**
     * Show the description view of the given schema object
     */
    context.subscriptions.push(vscode.commands.registerCommand("jdbcode.describe", (dbObject) => {
        dbController.showDescribe(dbObject)
    }))

}

export function trimSql(sql: string) : string {
    if (sql.charAt(sql.length-1) === ';') return sql.slice(0, sql.length-1)
    else return sql
}

// this method is called when your extension is deactivated
export function deactivate() {
    vscode.commands.executeCommand('jdbcode.disconnect')
}