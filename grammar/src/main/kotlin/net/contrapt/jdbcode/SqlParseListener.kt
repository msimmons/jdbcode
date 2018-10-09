package net.contrapt.jdbcode

import org.antlr.v4.runtime.*
import org.antlr.v4.runtime.atn.ATNConfigSet
import org.antlr.v4.runtime.dfa.DFA
import org.antlr.v4.runtime.misc.Interval
import java.util.*

class SqlParseListener : SqlJBaseListener(), ANTLRErrorListener {

    /** A stack of scopes for mapping aliases to tables, handles sub-selects */
    val tableScopes = Stack<MutableMap<String, Item.TableItem>>()

    /** Set of items with locations */
    val itemLocations = mutableSetOf<Item>()

    /** Error item if applicable */
    var syntaxError: Item? = null

    fun parse(sql: String) {
        val input = ANTLRInputStream(sql)
        val lexer = SqlJLexer(input)
        val tokens = CommonTokenStream(lexer)
        val parser = SqlJParser(tokens)
        parser.addErrorListener(this)
        parser.addParseListener(this)
        tableScopes.clear()
        itemLocations.clear()
        syntaxError = null
        parser.statement()
    }

    private fun getLocation(ctx: ParserRuleContext, pad: Boolean) : TokenRange {
        val point = getStartAndStop(ctx, pad)
        return TokenRange(point.first, point.second, ctx.start.line, ctx.start.charPositionInLine)
    }

    /**
     * Find the indices of any whitespace surrounding this rule -- handles cases where the cursor is sitting in whitespace
     * right before a rule starts or after a rule ends.  It is convenient to consider the whitespace as part of the rule
     * for completion purposes
     */
    private fun getStartAndStop(ctx: ParserRuleContext, pad: Boolean) : Pair<Int, Int> {
        var left = ctx.start.startIndex
        var right = ctx.stop?.stopIndex ?: ctx.start.stopIndex
        var end = ctx.start.inputStream.size()
        while (ctx.start.inputStream.getText(Interval(left-1, left-1)).isBlank() && left >= 1 && pad) left--
        while (ctx.start.inputStream.getText(Interval(right+1, right+1)).isBlank() && right < end && pad) right++
        return Pair(left, right)
    }

    private fun getLocation(ctx: ParserRuleContext) : TokenRange {
        return getLocation(ctx, false)
    }

    fun getCaretItem(char: Int) : Item {
        return itemLocations.find {
            it.range.start <= char && it.range.stop >= char && !(it is Item.NullItem)
        } ?: syntaxError ?: Item.NullItem(TokenRange(0, 0, 0, char))
    }

    override fun enterStatement(ctx: SqlJParser.StatementContext) {
        tableScopes.push(mutableMapOf())
    }

    override fun exitStatement(ctx: SqlJParser.StatementContext) {
        tableScopes.pop()
    }

    override fun exitTable_list(ctx: SqlJParser.Table_listContext) {
        itemLocations.add(Item.TableList(getLocation(ctx, true), tableScopes.peek()))
    }

    override fun exitSelect_list(ctx: SqlJParser.Select_listContext) {
        itemLocations.add(Item.SelectList(getLocation(ctx, true), tableScopes.peek()))
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
        val expected = msg?.split(",")?.toList() ?: emptyList()
        syntaxError = Item.SyntaxError(TokenRange(0, 0, line, charPositionInLine), expected)
    }

    override fun reportAmbiguity(recognizer: Parser?, dfa: DFA?, startIndex: Int, stopIndex: Int, exact: Boolean, ambigAlts: BitSet?, configs: ATNConfigSet?) {
    }

    override fun reportContextSensitivity(recognizer: Parser?, dfa: DFA?, startIndex: Int, stopIndex: Int, prediction: Int, configs: ATNConfigSet?) {
    }

}