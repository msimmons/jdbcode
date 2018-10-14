import { SqlJSListener } from '../grammar/build/generated-src/antlr/main/net/contrapt/jdbcode/SqlJSListener'
import { Position } from 'vscode';

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