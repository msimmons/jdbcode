package net.contrapt.jdbcode

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
        //val sql = "select col, a.boo, b.bar, * from x.tofu as a where x=y order by "
        //val sql = "select col from t, \n(select foo from bar b) a, mx.b"
        val sql = "select * from x.f"
        val parser = SqlParseListener()
        parser.parse(sql)
        println("test results")
        (0..sql.length).forEach {
            println(parser.getCaretItem(1, it))
        }
        //println(parser.tableMap)
        //println(parser.itemLocations)
    }

    @Test
    fun insertTest() {
        val sql = "insert into data (a, b, c) select af, cd, ef from tea"
        val parser = SqlParseListener()
        parser.parse(sql)
        (0..sql.length).forEach {
            println(parser.getCaretItem(1, it))
        }
    }

}