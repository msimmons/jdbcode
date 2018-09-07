package net.contrapt.jdbcode

import org.antlr.v4.runtime.*
import org.antlr.v4.runtime.atn.ATNConfigSet
import org.antlr.v4.runtime.dfa.DFA
import java.util.*

class SqlParseListener : SqlJBaseListener(), ANTLRErrorListener {

    /** The map of alias to table of objects that appear in this statement */
    val tableMap = mutableMapOf<String, Item>()

    /** A stack of scopes for mapping aliases to tables, handles sub-selects */
    val tableScopes = Stack<MutableMap<String, Item>>()

    /** Set of items with locations */
    val itemLocations = mutableSetOf<Item>()

    fun parse(sql: String) {
        val input = ANTLRInputStream(sql)//.substring(0..9))
        val lexer = SqlJLexer(input)
        val tokens = CommonTokenStream(lexer)
        val parser = SqlJParser(tokens)
        parser.addErrorListener(this)
        parser.addParseListener(this)
        parser.statement()
    }

    private fun getLocation(ctx: ParserRuleContext) : TokenRange {
        val start = ctx.start.startIndex
        val stop = ctx.stop?.stopIndex ?: ctx.start.stopIndex
        return TokenRange(start, stop, ctx.start.line, ctx.start.charPositionInLine)
    }

    fun getCaretItem(line: Int, char: Int) : Item? {
        return itemLocations.find {
            it.range.line == line && it.range.start <= char && it.range.stop >= char
        }
    }

    override fun enterStatement(ctx: SqlJParser.StatementContext) {
        tableScopes.push(mutableMapOf())
    }

    override fun exitStatement(ctx: SqlJParser.StatementContext) {
        tableScopes.pop()
    }

    override fun exitTable_list(ctx: SqlJParser.Table_listContext) {
        itemLocations.add(Item.TableList(getLocation(ctx)))
    }

    override fun exitSelect_list(ctx: SqlJParser.Select_listContext) {
        itemLocations.add(Item.SelectList(getLocation(ctx)))
    }

    override fun exitTable_item(ctx: SqlJParser.Table_itemContext) {
        val name = ctx.table_expr()?.table_name()?.text ?: ""
        val owner = ctx.table_expr()?.owner_name()?.text ?: ""
        val alias = ctx.alias_name()?.text ?: name
        val item = Item.TableItem(getLocation(ctx), owner, name, alias)
        tableScopes.peek().put(alias, item)
    }

    override fun exitTable_expr(ctx: SqlJParser.Table_exprContext) {
        val name = ctx.table_name()?.text ?: ""
        val owner = ctx.owner_name()?.text ?: ""
        val item = Item.TableItem(getLocation(ctx), owner, name, name)
        itemLocations.add(item)
        if (ctx.parent !is SqlJParser.Table_itemContext) tableScopes.peek().put(name, item)
    }

    override fun exitColumn_expr(ctx: SqlJParser.Column_exprContext) {
        val tableAlias = ctx.alias_name()?.text ?: ""
        val name = ctx.column_name()?.text ?: ""
        val item = Item.ColumnExpr(getLocation(ctx), tableAlias, name, tableScopes.peek())
        itemLocations.add(item)
    }

    override fun reportAttemptingFullContext(recognizer: Parser?, dfa: DFA?, startIndex: Int, stopIndex: Int, conflictingAlts: BitSet?, configs: ATNConfigSet?) {
    }

    override fun syntaxError(recognizer: Recognizer<*, *>?, offendingSymbol: Any?, line: Int, charPositionInLine: Int, msg: String?, e: RecognitionException?) {
    }

    override fun reportAmbiguity(recognizer: Parser?, dfa: DFA?, startIndex: Int, stopIndex: Int, exact: Boolean, ambigAlts: BitSet?, configs: ATNConfigSet?) {
    }

    override fun reportContextSensitivity(recognizer: Parser?, dfa: DFA?, startIndex: Int, stopIndex: Int, prediction: Int, configs: ATNConfigSet?) {
    }

}