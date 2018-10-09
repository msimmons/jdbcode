package net.contrapt.jdbcode

import org.junit.Test

abstract class AbstractSqlParserTest {
    abstract val sql: String
    abstract val expectations: List<Expected<*>>
    abstract val partials: List<Expected<*>>

    @Test
    fun doTest() {
        val parser = SqlParseListener()
        parser.parse(sql)
        expectations.forEach {
            val item = parser.getCaretItem(it.col)
            it.test(item)
        }
        partials.forEach {
            parser.parse(sql.substring(0..it.col))
            val item = parser.getCaretItem(it.col)
            it.test(item)
        }
    }

}
