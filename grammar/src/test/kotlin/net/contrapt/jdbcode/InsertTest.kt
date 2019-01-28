package net.contrapt.jdbcode

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue

class InsertTest : AbstractSqlParserTest() {
    override val sql = """insert into data (a, b, c) select af, cd, ef from tea"""
    override val expectations = listOf(
            Expected.ETableItem(12){
                assertEquals("data", it.name)
            },
            Expected.EColumnExpr(24) {
                assertEquals("Column name", "c", it.name)
                assertEquals(null, it.tableMap[it.tableAlias]?.name)
            },
            Expected.ESelectList(40) {},
            Expected.EColumnExpr(42) {
                assertEquals("ef", it.name)
                assertTrue("Table alias", it.tableMap.containsKey("tea"))
            },
            Expected.ETableItem(51) {
                assertEquals("tea", it.name)
            }
    )
    override val partials = listOf<Expected<*>>()
}