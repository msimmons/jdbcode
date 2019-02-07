package net.contrapt.jdbcode

import net.contrapt.jdbcode.model.ParseItem
import org.junit.Assert
import org.junit.Test
import kotlin.reflect.KClass

abstract class SqlParserTest {
    abstract val sql: String
    abstract val expectations: List<ExpectedItem>
    abstract val partials: List<ExpectedItem>

    @Test
    fun doTest() {
        val parser = SqlParseListener()
        parser.parse(sql)
        expectations.forEach {
            printExpected(sql, it.col, it)
            val item = parser.getCaretItem(it.col)
            it.doTest(item)
        }
        partials.forEach {
            printExpected(sql.substring(0.. it.col), it.col, it)
            parser.parse(sql.substring(0..it.col))
            val item = parser.getCaretItem(it.col)
            it.doTest(item)
        }
    }

    private fun printExpected(sql: String, column: Int, expected: ExpectedItem) {
        println(sql)
        println(" ".repeat(column)+"^ ($column:${expected.klass.simpleName})")
    }

    interface ExpectedItem {
        val col: Int
        val klass: KClass<*>
        fun doTest(actual: ParseItem?)
    }
    inline fun <reified T: ParseItem> expectedItem(column: Int, klass: KClass<T>, crossinline test: (T) -> Unit) = object : ExpectedItem {
        override val col = column
        override val klass = klass
        override fun doTest(actual: ParseItem?) {
            when (actual) {
                is T -> test(actual)
                null -> Assert.assertTrue("At column $col:\n  Expected: ${klass.simpleName}\n    Actual: null", false)
                else -> Assert.assertTrue("At column $col:\n  Expected: ${klass.simpleName}\n    Actual: ${actual::class.simpleName}", false)
            }
        }
    }
}
