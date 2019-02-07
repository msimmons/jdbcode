package net.contrapt.jdbcode

import net.contrapt.jdbcode.model.ColumnExpr
import net.contrapt.jdbcode.model.TableItem
import net.contrapt.jdbcode.model.ValueExpr
import org.junit.Assert.*

class SelectTest2 : SqlParserTest() {
    override val sql = """select sum(decode(col1, null, 0, 1)) over (partition by col2) from  atable group by acolumn order by 1 """
    //override val sql = """select sum(decode(col1, null, 0, 1)) over (partition by col2 order by col3) from  atable group by acolumn order by 1 """
    override val expectations = listOf(
            expectedItem(6, ValueExpr::class) {
            },
            expectedItem(7, ValueExpr::class) {
                assertTrue(it.tableMap.containsKey("atable"))
            },
            expectedItem(18, ColumnExpr::class) {},
            expectedItem(24, ValueExpr::class) {},
            expectedItem(30, ValueExpr::class) {},
            expectedItem(33, ValueExpr::class) {},
            expectedItem(43, ColumnExpr::class) {
            },
            expectedItem(58, ColumnExpr::class) {
                assertEquals("col2", it.name)
            },
            expectedItem(68, TableItem::class) {
            },
            expectedItem(85, ColumnExpr::class) {
            }
    )
    override val partials = listOf(
            expectedItem(7, ColumnExpr::class) {
                assertEquals("s", it.name)
                assertFalse(it.tableMap.containsKey("atable"))
            },
            expectedItem(42, ValueExpr::class) {
            },
            expectedItem(58, ColumnExpr::class) {
            },
            expectedItem(69, TableItem::class) {
            },
            expectedItem(86, ColumnExpr::class) {
                assertTrue(it.tableMap.containsKey("atable"))
            }
    )
}