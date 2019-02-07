package net.contrapt.jdbcode

import net.contrapt.jdbcode.model.ColumnExpr
import net.contrapt.jdbcode.model.TableItem
import org.junit.Assert.*

class InsertTest : SqlParserTest() {
    override val sql = """insert into data (a, b, c) select af, cd, ef from tea"""
    override val expectations = listOf(
            expectedItem(12, TableItem::class){
                assertEquals("data", it.name)
            },
            expectedItem(24, ColumnExpr::class) {
                assertEquals("Column name", "c", it.name)
                assertEquals(null, it.tableMap[it.tableAlias]?.name)
                assertTrue("Scope has data", it.tableMap.containsKey("data"))
                assertFalse("Scope does not have tea", it.tableMap.containsKey("tea"))
            },
            expectedItem(40, ColumnExpr::class) {},
            expectedItem(42, ColumnExpr::class) {
                assertEquals("ef", it.name)
                assertTrue("Scope has tea", it.tableMap.containsKey("tea"))
                assertFalse("Scope does not have data", it.tableMap.containsKey("data"))
            },
            expectedItem(51, TableItem::class) {
                assertEquals("tea", it.name)
            }
    )
    override val partials = listOf<ExpectedItem>()
}