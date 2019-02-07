package net.contrapt.jdbcode

import net.contrapt.jdbcode.model.ColumnExpr
import net.contrapt.jdbcode.model.TableItem
import net.contrapt.jdbcode.model.ValueExpr
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue

class InsertTest2 : SqlParserTest() {
    override val sql = """insert into data (a, b, c) values(1, 2, 3, a, b, c)"""
    override val expectations = listOf(
            expectedItem(12, TableItem::class){
                assertEquals("data", it.name)
            },
            expectedItem(24, ColumnExpr::class) {
                assertEquals("Column name", "c", it.name)
                assertEquals(null, it.tableMap[it.tableAlias]?.name)
            },
            expectedItem(40, ValueExpr::class) {},
            expectedItem(43, ColumnExpr::class) {
                assertEquals("a", it.name)
                assertTrue("Table alias", it.tableMap.containsKey("data"))
            }
    )
    override val partials = listOf<ExpectedItem>(
            expectedItem(12, TableItem::class){
                assertEquals("d", it.name)
            },
            expectedItem(24, ColumnExpr::class) {
                assertEquals("Column name", "c", it.name)
                assertEquals(null, it.tableMap[it.tableAlias]?.name)
            },
            expectedItem(40, ValueExpr::class) {},
            expectedItem(43, ColumnExpr::class) {
                assertEquals("a", it.name)
                assertTrue("Table alias", it.tableMap.containsKey("data"))
            }
    )
}