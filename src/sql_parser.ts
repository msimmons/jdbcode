import * as antlr4 from 'antlr4/index'
import { SqlJSLexer } from '../grammar/build/generated-src/antlr/main/net/contrapt/jdbcode/SqlJSLexer'
import { SqlJSParser } from '../grammar/build/generated-src/antlr/main/net/contrapt/jdbcode/SqlJSParser'
import { ListenerFactory } from './sql_listener'
import { Position } from 'vscode';

export class SqlParser {

    factory: ListenerFactory = new ListenerFactory()

    parse(sql: String, caret: Position) {
        let istream = new antlr4.InputStream(sql)
        let lexer = new SqlJSLexer(istream)
        let tokens = new antlr4.CommonTokenStream(lexer)
        let parser = new SqlJSParser(tokens)
        let listener = this.factory.createListener(caret)
        let tree  = parser.statement()
        antlr4.tree.ParseTreeWalker.DEFAULT.walk(listener, tree)
        return this.factory.getResult()
    }    

}

