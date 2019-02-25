'use strict';

import * as vscode from 'vscode';
import { DatabaseService } from './database_service';
import { readFileSync } from 'fs';
import { ObjectNode } from './models';

export class SchemaWebview {

    private context: vscode.ExtensionContext
    private service: DatabaseService
    private objectNode: ObjectNode
    private panel: vscode.WebviewPanel
    private hasPendingUpdate: boolean = false
    private result: {}

    public constructor(context: vscode.ExtensionContext, service: DatabaseService) {
        this.context = context
        this.service = service
    }

    create(objectNode: ObjectNode, docName: string) {
        this.objectNode = objectNode
        this.panel = vscode.window.createWebviewPanel('jdbcode.schema', docName, vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        })

        this.panel.onDidDispose(() => { this.disposed() }, null, this.context.subscriptions)

        this.panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'cancel':
                    this.cancel()
                    break
                case 'export':
                    this.export()
                    break
            }
        }, null, this.context.subscriptions)

        this.panel.onDidChangeViewState(event => {
            this.pendingUpdate()
        }, null, this.context.subscriptions)

        this.panel.webview.html = this.getSchemaHtml()

        // Execute the statement
        this.update(this.objectNode, 'executing')
        this.execute()
    }

    private sendMessage() {
        this.panel.webview.postMessage(this.result)
    }

    private pendingUpdate() {
        if (this.hasPendingUpdate && this.panel.visible) {
            this.sendMessage()
            this.hasPendingUpdate = false
        }
    }

    private update(objectNode: ObjectNode, status: string, error = undefined) {
        this.objectNode = objectNode
        this.result = {object: this.objectNode, status: status, error: error}
        if (this.panel.visible) {
            this.sendMessage()
        } else {
            this.hasPendingUpdate = true
        }
    }

    private async execute() {
        try {
            let result = await this.service.describe(this.objectNode)
            this.update(result, 'executed')
        }
        catch (error) {
            this.update(this.objectNode, 'error', error.message)
            //vscode.window.showErrorMessage('Error describing object: ' + error.message)
        }
    }

    private async cancel() {
    }

    private disposed() {
        this.panel = null
        this.objectNode = null
        this.context = null
        this.service = null
    }

    private export() {
    }

    close() {
        if (this.panel) {
            this.panel.dispose()
        }
    }

    private getSchemaHtml() : string {
        let indexPath = this.context.asAbsolutePath('reactui/build/index.html')
        let index = readFileSync(indexPath).toString()
        let scriptUri = vscode.Uri.file(this.context.asAbsolutePath('reactui/build/'))
        scriptUri = scriptUri.with({scheme: 'vscode-resource'})
        index = index.replace(/\.\//g, scriptUri.toString())
        let viewType = this.getViewType(this.objectNode)
        index = index.replace('$VIEW', viewType)
        return index
    }

    private getViewType(objectNode: ObjectNode) : string {
        switch(objectNode.data.type) {
            case "function":
            case "procedure":
                return 'PROCEDURE_VIEW'
            default:
                return 'TABLE_VIEW'
        }
    }
}