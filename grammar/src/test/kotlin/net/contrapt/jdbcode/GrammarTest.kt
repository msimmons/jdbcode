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
     */

    @Test
    fun testTest() {
        //val sql = "select * from x.a as a where x=y order by z"
        val sql = "select col from t order"
        val input = ANTLRInputStream(sql.byteInputStream())
        val lexer = SqlLexer(input)
        val tokens = CommonTokenStream(lexer)
        val parser = SqlParser(tokens)
        parser.addParseListener(MyParseListener())
        parser.statement()
    }

    class MyParseListener : SqlBaseListener() {

        override fun enterTable_name(ctx: SqlParser.Table_nameContext) {
            println("Enter trable ${ctx.start.charPositionInLine}")
        }

        override fun exitTable_name(ctx: SqlParser.Table_nameContext) {
            println(ctx.text)
        }

        override fun enterColumn_name(ctx: SqlParser.Column_nameContext) {
            println("Enter column ${ctx.start.charPositionInLine}")
        }
    }

}