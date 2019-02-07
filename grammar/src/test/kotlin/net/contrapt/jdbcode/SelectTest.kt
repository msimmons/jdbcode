package net.contrapt.jdbcode

import net.contrapt.jdbcode.model.ColumnExpr
import net.contrapt.jdbcode.model.TableItem
import net.contrapt.jdbcode.model.ValueExpr
import org.junit.Assert.*

class SelectTest : SqlParserTest() {
    override val sql = """select col1, a.col2, a.col3 "foo",a. from  x.tofu as a where a.col1 = 'hello' and a.col2  """
    override val expectations = listOf(
            expectedItem(6, ValueExpr::class) {
            },
            expectedItem(7, ColumnExpr::class) {
                assertEquals("col1", it.name)
                assertTrue(it.tableMap.containsKey("a"))
            },
            expectedItem(11, ColumnExpr::class) {},
            expectedItem(12, ValueExpr::class) {},
            expectedItem(13, ColumnExpr::class) {
                assertEquals("a", it.tableAlias)
                assertEquals("col2", it.name)
            },
            expectedItem(24, ColumnExpr::class ) {
                assertEquals("a", it.tableAlias)
                assertEquals("col3", it.name)
                assertEquals("tofu", it.tableMap[it.tableAlias]?.name)
            },
            expectedItem(35, ColumnExpr::class ) {
                assertEquals("a", it.tableAlias)
                assertEquals("tofu", it.tableMap[it.tableAlias]?.name)
            },
            expectedItem(42, TableItem::class) {},
            expectedItem(43, TableItem::class) {
                assertEquals("tofu", it.name)
                //assertEquals("a", it.alias)
                assertEquals("x", it.owner)
            },
            expectedItem(63, ColumnExpr::class) {
                assertEquals("col1", it.name)
                assertEquals("a", it.tableAlias)
            },
            expectedItem(83, ColumnExpr::class) {}
    )
    override val partials = listOf(
            expectedItem(7, ColumnExpr::class) {
                assertEquals("c", it.name)
                assertFalse(it.tableMap.containsKey("a"))
            },
            expectedItem(35, ColumnExpr::class ) {
            },
            expectedItem(42, TableItem::class) {
            },
            expectedItem(61, ColumnExpr::class) {
            },
            expectedItem(69, ValueExpr::class) {
            },
            expectedItem(89, ValueExpr::class) {
                assertTrue(it.tableMap.containsKey("a"))
            }
    )
}