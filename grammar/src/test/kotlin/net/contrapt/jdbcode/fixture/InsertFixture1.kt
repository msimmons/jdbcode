package net.contrapt.jdbcode.fixture

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue

object InsertFixture1 : Fixture {
    override val sql = """insert into data (a, b, c) select af, cd, ef from tea"""
    override val expectations = listOf(
            Expected.TableItem(12){
                assertEquals("data", it.name)
            },
            Expected.ColumnExpr(24) {
                assertEquals("Column name", "c", it.name)
                assertEquals(null, it.tableMap[it.tableAlias]?.name)
            },
            Expected.SelectList(40) {},
            Expected.ColumnExpr(42) {
                assertEquals("ef", it.name)
                assertTrue("Table alias", it.tableMap.containsKey("tea"))
            },
            Expected.TableItem(51) {
                assertEquals("tea", it.name)
            }
    )
    override val partials = listOf<Expected<*>>()
}