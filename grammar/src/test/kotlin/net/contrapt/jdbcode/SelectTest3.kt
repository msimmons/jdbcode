package net.contrapt.jdbcode

import net.contrapt.jdbcode.model.ColumnExpr
import net.contrapt.jdbcode.model.TableItem
import net.contrapt.jdbcode.model.ValueExpr
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue

class SelectTest3 : SqlParserTest() {
    override val sql = """select sum(decode(col1, null, 0, 1)) over (partition by col2 order by col3) from  atable group by acolumn order by 1 """
    override val expectations = listOf(
            expectedItem(6, ValueExpr::class) {
                assertTrue(it.tableMap.containsKey("atable"))
            },
            expectedItem(7, ValueExpr::class) {
                assertTrue(it.tableMap.containsKey("atable"))
            },
            expectedItem(11, ValueExpr::class) {
                assertTrue(it.tableMap.containsKey("atable"))

            },
            expectedItem(18, ColumnExpr::class) {
                assertEquals("col1", it.name)
            },
            expectedItem(24, ValueExpr::class) {},
            expectedItem(30, ValueExpr::class) {},
            expectedItem(33, ValueExpr::class) {},
            expectedItem(43, ColumnExpr::class) {
            },
            expectedItem(53, ValueExpr::class) {
            },
            expectedItem(58, ColumnExpr::class) {
                assertEquals("col2", it.name)
            },
            expectedItem(61, ValueExpr::class) {
            },
            expectedItem(68, ValueExpr::class) {
            },
            expectedItem(70, ColumnExpr::class) {
                assertEquals("col3", it.name)
            },
            expectedItem(85, TableItem::class) {
                assertEquals("atable", it.name)
            },
            expectedItem(98, ColumnExpr::class) {
                assertEquals("acolumn", it.name)
            }
    )
    override val partials = listOf<ExpectedItem>(
            expectedItem(6, ValueExpr::class) {
            },
            expectedItem(7, ColumnExpr::class) {
            },
            expectedItem(11, ColumnExpr::class) {
            },
            expectedItem(18, ColumnExpr::class) {
            },
            expectedItem(24, ColumnExpr::class) {},
            expectedItem(30, ValueExpr::class) {},
            expectedItem(33, ValueExpr::class) {},
            expectedItem(43, ColumnExpr::class) {
            },
            expectedItem(53, ColumnExpr::class) {
            },
            expectedItem(58, ColumnExpr::class) {
            },
            expectedItem(61, ColumnExpr::class) {
            },
            expectedItem(68, ValueExpr::class) {
            },
            expectedItem(70, ColumnExpr::class) {
            },
            expectedItem(85, TableItem::class) {
                assertEquals("atab", it.name)
            },
            expectedItem(98, ColumnExpr::class) {
                assertEquals("a", it.name)
            }
    )
}