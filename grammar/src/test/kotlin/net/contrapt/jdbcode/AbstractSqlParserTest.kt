package net.contrapt.jdbcode

import net.contrapt.jdbcode.model.ParseItem
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
            printExpected(sql, it.col, it)
            val item = parser.getCaretItem(it.col)
            it.test(item)
        }
        partials.forEach {
            printExpected(sql.substring(0.. it.col), it.col, it)
            parser.parse(sql.substring(0..it.col))
            val item = parser.getCaretItem(it.col)
            it.test(item)
        }
    }

    private fun <T: ParseItem> printExpected(sql: String, column: Int, expected: Expected<T>) {
        println(sql)
        println(" ".repeat(column)+"^ ($column:${expected.klass.simpleName})")
    }
}
