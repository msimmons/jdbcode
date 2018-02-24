import { SqlJSListener } from '../grammar/build/generated-src/antlr/main/net/contrapt/jdbcode/SqlJSListener'
import { SqlJSParser } from '../grammar/build/generated-src/antlr/main/net/contrapt/jdbcode/SqlJSParser'
import { ParserContext } from 'antlr4'
import { Position } from 'vscode';
import { SqlParser } from './sql_parser';

export class ObjectSpec {
    type: string
    owner: string
    name: string
}

export class ListenerFactory {

    caretObject : ObjectSpec
    tableMap : Map<String, Object>

    createListener(caret: Position) : object {
        this.caretObject = new ObjectSpec()
        this.tableMap = new Map()
        return new SqlListener(caret, this.caretObject, this.tableMap)
    }

    getResult() : object {
        let result
        switch ( this.caretObject.type ) {
            case 'column':
                result = {type: 'column', of: this.tableMap[this.caretObject.owner].table}
                break
            case 'table':
                result = {type: 'table', of: this.caretObject.owner}
                break
            case 'owner':
                result = {type: 'owner'}
                break
            case 'alias':
                result = {type: 'alias', of: this.tableMap.keys()}
        }
        return result
    }
}

let SqlListener = function(caret: Position, caretObject: ObjectSpec, tableMap: Map<String,Object>) : void {
    SqlJSListener.call(this)
    this.caret = caret
    this.caretObject = caretObject
    this.tableMap = tableMap
    return this
};

SqlListener.prototype = Object.create(SqlJSListener.prototype)
SqlListener.prototype.constructor = SqlListener

SqlListener.prototype.exitTable_expression = function(ctx) {
    let fq_table_name
    let alias_name
    let table_name
    let owner_name
    ctx.children.forEach((child) => {
        if ( child instanceof SqlJSParser.Fq_table_nameContext ) fq_table_name = child
        if ( child instanceof SqlJSParser.Alias_nameContext ) alias_name = child.start.text
    })
    fq_table_name.children.forEach((child) => {
        if ( child instanceof SqlJSParser.Table_nameContext ) {
            table_name = child.start.text
        }
        if ( child instanceof SqlJSParser.Owner_nameContext ) {
            owner_name =  child.start.text
        }
    })
    if ( alias_name ) this.tableMap[alias_name] = {table: table_name, owner: owner_name}
    else this.tableMap[table_name] = {table: table_name, owner: owner_name}
}

SqlListener.prototype.exitFq_table_name = function(ctx) {
    let table_name
    let owner_name
    let type
    ctx.children.forEach((child) => {
        if ( child instanceof SqlJSParser.Table_nameContext ) {
            table_name = child.start.text
            if ( this.isCaretInChild(child) ) type = 'table'
        }
        if ( child instanceof SqlJSParser.Owner_nameContext ) {
            owner_name = child.start.text
            if ( this.isCaretInChild(child) ) type = 'owner'
        }
    })
    if ( type ) {
        this.caretObject.type = type
        this.caretObject.owner = owner_name
        this.caretObject.name = table_name
    }
}

SqlListener.prototype.exitColumn_expr = function(ctx) {
    let alias_name
    let column_name
    let column_alias
    let type
    ctx.children.forEach((child) => {
        if ( child instanceof SqlJSParser.Column_nameContext ) {
            column_name = child.start.text
            if ( this.isCaretInChild(child) ) type = 'column'
        }
        if ( child instanceof SqlJSParser.Column_wildcardContext ) {
            column_name = child.start.text
            if ( this.isCaretInChild(child) ) type = 'column'
        }
        if ( child instanceof SqlJSParser.Alias_nameContext ) {
            alias_name = child.start.text
            if ( this.isCaretInChild(child) ) type = 'alias'
        }
        if ( child instanceof SqlJSParser.Column_aliasContext ) column_alias = child.start.text
    })
    if ( type ) {
        this.caretObject.type = type
        this.caretObject.owner = alias_name
        this.caretObject.name = column_name
    }
}

SqlListener.prototype.isCaretInChild = function(child: ParserContext) : boolean {
    return /*this.caret.line === child.start.line && */ true &&
        this.caret.character >= child.start.start && 
        this.caret.character <= child.start.stop+1
}