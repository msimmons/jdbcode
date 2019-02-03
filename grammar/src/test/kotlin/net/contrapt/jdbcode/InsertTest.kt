package net.contrapt.jdbcode

import net.contrapt.jdbcode.model.ColumnExpr
import net.contrapt.jdbcode.model.TableItem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue

class InsertTest : SqlParserTest() {
    override val sql = """insert into data (a, b, c) select af, cd, ef from tea"""
    override val expectations = listOf(
            expectedItem(12, TableItem::class){
                assertEquals("data", it.name)
            },
            expectedItem(24, ColumnExpr::class) {
                assertEquals("Column name", "c", it.name)
                assertEquals(null, it.tableMap[it.tableAlias]?.name)
            },
            expectedItem(40, ColumnExpr::class) {},
            expectedItem(42, ColumnExpr::class) {
                assertEquals("ef", it.name)
                assertTrue("Table alias", it.tableMap.containsKey("tea"))
            },
            expectedItem(51, TableItem::class) {
                assertEquals("tea", it.name)
            }
    )
    override val partials = listOf<ExpectedItem>()
}