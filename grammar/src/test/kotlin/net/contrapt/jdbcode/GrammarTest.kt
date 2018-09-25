package net.contrapt.jdbcode

import net.contrapt.jdbcode.fixture.DeleteFixture1
import net.contrapt.jdbcode.fixture.Fixture
import net.contrapt.jdbcode.fixture.InsertFixture1
import net.contrapt.jdbcode.fixture.SelectFixture1
import org.junit.Test

open class GrammarTest {

    @Test
    fun deleteFixture1() {
        testFixture(DeleteFixture1)
    }

    @Test
    fun insertFixture1() {
        testFixture(InsertFixture1)
    }

    @Test
    fun selectFixture1() {
        testFixture(SelectFixture1)
    }

    private fun testFixture(fixture: Fixture) {
        val parser = SqlParseListener()
        parser.parse(fixture.sql)
        fixture.expectations.forEach {
            val item = parser.getCaretItem(1, it.col)
            it.test(item)
        }
        fixture.partials.forEach {
            parser.parse(fixture.sql.substring(0..it.col))
            val item = parser.getCaretItem(1, it.col)
            it.test(item)
        }
    }

}