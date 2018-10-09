import { SqlJSListener } from '../grammar/build/generated-src/antlr/main/net/contrapt/jdbcode/SqlJSListener'
import { SqlJSParser } from '../grammar/build/generated-src/antlr/main/net/contrapt/jdbcode/SqlJSParser'
import { ParserContext } from 'antlr4'
import { Position } from 'vscode';
import { SqlParser } from './sql_parser';

export class ObjectSpec {
    type: string
    owner: string
    name: string
    values: string[]
}

export class ListenerFactory {

    createListener(caret: Position) : object {
        return new SqlListener(caret)
    }
}

let SqlListener = function(caret: Position) : void {
    SqlJSListener.call(this)
    this.caret = caret
    return this
};

SqlListener.prototype = Object.create(SqlJSListener.prototype)
SqlListener.prototype.constructor = SqlListener

SqlListener.prototype.enterSql_file = function(ctx) {
    let stop = ctx.stop
}

SqlListener.prototype.exitSql_file = function(ctx) {
    let stop = ctx.stop
}