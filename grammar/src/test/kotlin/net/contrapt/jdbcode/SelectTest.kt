package net.contrapt.jdbcode

import org.junit.Assert.*

class SelectTest : AbstractSqlParserTest() {
    override val sql = """select col1, a.col2, a.col3 "foo", * from  x.tofu as a where a.col1 = 'hello' and a.col2  """
    override val expectations = listOf(
            Expected.ESelectList(6) {
            },
            Expected.EColumnExpr(7) {
                assertEquals("col1", it.name)
                assertTrue(it.tableMap.containsKey("a"))
            },
            Expected.ESelectList(11) {},
            Expected.ESelectList(12) {},
            Expected.EColumnExpr(13) {
                assertEquals("a", it.tableAlias)
                assertEquals("col2", it.name)
            },
            Expected.EColumnExpr(24) {
                assertEquals("a", it.tableAlias)
                assertEquals("col3", it.name)
                assertEquals("tofu", it.tableMap[it.tableAlias]?.name)
            },
            Expected.ETableList(42) {},
            Expected.ETableItem(43) {
                assertEquals("tofu", it.name)
                //assertEquals("a", it.alias)
                assertEquals("x", it.owner)
            },
            Expected.EColumnExpr(63) {
                assertEquals("col1", it.name)
                //assertEquals("a", it.alias)
                assertEquals("a", it.tableAlias)
            },
            Expected.EColumnExpr(83) {}
    )
    override val partials = listOf(
            Expected.EColumnExpr(7) {
                assertEquals("c", it.name)
                assertFalse(it.tableMap.containsKey("a"))
            },
            Expected.ETableList(42) {
            },
            Expected.EColumnExpr(61) {
            },
            Expected.EValueExpr(69) {
            },
            Expected.EValueExpr(89) {
                assertTrue(it.tableMap.containsKey("a"))
            }
    )
}