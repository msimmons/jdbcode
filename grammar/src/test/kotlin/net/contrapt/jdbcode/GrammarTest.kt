package net.contrapt.jdbcode

import org.antlr.v4.runtime.ANTLRInputStream
import org.antlr.v4.runtime.CommonTokenStream
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
        //val sql = "select * from x.a as a where x=y order by z"
        val sql = "select col from t, \n(select foo from bar b) a, mx.b"
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
       val locationToType = mutableMapOf<Pair<Int,Int>, String>()

        override fun enterTable_expression(ctx: SqlJParser.Table_expressionContext) {
            locationToType.put(Pair(ctx.start.line, ctx.start.charPositionInLine), "table")
        }

        override fun exitTable_expression(ctx: SqlJParser.Table_expressionContext) {
            val name = ctx.fq_table_name()?.table_name()?.text ?: ""
            val owner = ctx.fq_table_name()?.owner_name()
            val alias = ctx.alias_name()?.text ?: name
            aliasToTable.put(alias, name)
            println("    ${ctx.K_AS()} ${ctx.alias_name()?.text} ${ctx.fq_table_name()?.owner_name()?.text} ${ctx.fq_table_name()?.table_name()?.text}")
        }

        override fun enterColumn_name(ctx: SqlJParser.Column_nameContext) {
            locationToType.put(Pair(ctx.start.line, ctx.start.charPositionInLine), "column")
        }
    }

}