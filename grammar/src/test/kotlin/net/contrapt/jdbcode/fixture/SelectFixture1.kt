package net.contrapt.jdbcode.fixture

import org.junit.Assert.*

object SelectFixture1 : Fixture {
    override val sql = """select col1, a.col2, a.col3 "foo", * from x.tofu as a where a.col1 = 'hello' and a.col2"""
    override val expectations = listOf(
            Expected.ColumnExpr(7) {
                assertEquals("col1", it.name)
                assertTrue(it.tableMap.containsKey("a"))
            },
            Expected.SelectList(12) {},
            Expected.ColumnExpr(13) {
                assertEquals("a", it.tableAlias)
                assertEquals("col2", it.name)
            },
            Expected.ColumnExpr(24) {
                assertEquals("a", it.tableAlias)
                assertEquals("col3", it.name)
                assertEquals("tofu", it.tableMap[it.tableAlias]?.name)
            },
            Expected.NullItem(40) {},
            Expected.TableItem(42) {
                assertEquals("tofu", it.name)
                //assertEquals("a", it.alias)
                assertEquals("x", it.owner)
            },
            Expected.ColumnExpr(62) {
                assertEquals("col1", it.name)
                //assertEquals("a", it.alias)
                assertEquals("a", it.tableAlias)
            },
            Expected.ColumnExpr(82) {}
    )
    override val partials = listOf(
            Expected.ColumnExpr(7) {
                assertEquals("c", it.name)
                assertFalse(it.tableMap.containsKey("a"))
            }
    )

}