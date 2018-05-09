package net.contrapt.jdbcode

import org.antlr.v4.runtime.ANTLRInputStream
import org.antlr.v4.runtime.CommonTokenStream
import org.antlr.v4.runtime.ParserRuleContext
import org.junit.Test

open class GrammarTest {

    /**
     * From current caret position...
     *    Search back for valid beginning of statement (for simplicity check beginning of each preceding line)
     *    Parse from beginning to end of current caret line
     * Gather objectName/type, columnName info (text and positions)
     * Then we know what to suggest at those caret positions and whether they are valid
     *
     */

    @Test
    fun testTest() {
        val sql = "select * from x.table as a where x=y order by z"
        //val sql = "select col from t, \n(select foo from bar b) a, mx.b"
        val input = ANTLRInputStream(sql)
        val lexer = SqlJLexer(input)
        val tokens = CommonTokenStream(lexer)
        val parser = SqlJParser(tokens)
        val listener = MyParseListener()
        parser.addParseListener(listener)

        val context = parser.statement()
        println(listener.aliasToTable)
        println(listener.locationToType)
    }

    /**
     * (object,alias) in statement
     * (line, character) -> obje
     */
    class MyParseListener : SqlJBaseListener() {

        /** The map of alias to table of objects that appear in this statement */
        val aliasToTable = mutableMapOf<String, String>()

        /** Map of location to type of thing expected */
        val locationToType = mutableMapOf<Triple<Int, Int, Int>, String>()

        private fun recordTypeLocation(ctx: ParserRuleContext, type: String) {
            locationToType[Triple(ctx.start.line, ctx.start.startIndex, ctx.start.stopIndex)] = type
        }

        override fun enterTable_list(ctx: SqlJParser.Table_listContext) {
            recordTypeLocation(ctx, "table_list")
        }

        override fun enterColumn_list(ctx: SqlJParser.Column_listContext) {
            recordTypeLocation(ctx, "column_list")
        }

        override fun enterTable_expression(ctx: SqlJParser.Table_expressionContext) {
            recordTypeLocation(ctx, "table")
        }

        override fun exitTable_expression(ctx: SqlJParser.Table_expressionContext) {
            val name = ctx.fq_table_name()?.table_name()?.text ?: ""
            val owner = ctx.fq_table_name()?.owner_name()
            val alias = ctx.alias_name()?.text ?: name
            aliasToTable.put(alias, name)
            println("    ${ctx.K_AS()} ${ctx.alias_name()?.text} ${ctx.fq_table_name()?.owner_name()?.text} ${ctx.fq_table_name()?.table_name()?.text}")
        }

        override fun enterColumn_name(ctx: SqlJParser.Column_nameContext) {
            recordTypeLocation(ctx, "column")
        }
    }

}