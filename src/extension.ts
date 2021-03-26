'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {  ConfigurationTarget } from 'vscode'
import { DatabaseController } from './database_controller';
import { DatabaseService } from './database_service';
import { ConnectionData, DriverData } from './models';

let dbController: DatabaseController

export function activate(context: vscode.ExtensionContext) {

    dbController = new DatabaseController(context)
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
    context.subscriptions.push(vscode.commands.registerCommand('jdbcode.addConnection', async () => {
        let config = vscode.workspace.getConfiguration("jdbcode")
        let connections = config.get('connections') as Array<ConnectionData>
        let drivers = config.get('drivers') as Array<DriverData>
        let name = await vscode.window.showInputBox({ placeHolder: 'A name for the connection' })
        if (!name) return
        if (connections.find((c) => { return c.name === name })) {
            vscode.window.showErrorMessage(`Connection '${name}' already exists`)
            return
        }
        let driver = await vscode.window.showQuickPick(drivers.map(d=>d.name), {canPickMany: false, placeHolder: 'Choose Driver' })
        if (!driver) return
        let username = await vscode.window.showInputBox({ placeHolder: 'Username' })
        if (!username) return
        let password = await vscode.window.showInputBox({ placeHolder: 'Password', password: true })
        if (!password) return
        let host = await vscode.window.showInputBox({ placeHolder: 'Database Host' })
        if (!host) return
        let port = await vscode.window.showInputBox({ placeHolder: 'Database Port', validateInput: (value) => {return parseInt(value, 10).toString() === "NaN" ? "Must be a number" : undefined}})
        if (!port) return
        let database = await vscode.window.showInputBox({ placeHolder: 'Database Name' })
        let connecton = {name: name, driver: driver, username: username, password: password, host: host, port: parseInt(port), database: database} as ConnectionData
        connections.push(connecton)
        await config.update('connections', connections, ConfigurationTarget.Workspace)
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