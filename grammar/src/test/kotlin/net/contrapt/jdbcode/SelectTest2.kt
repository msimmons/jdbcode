package net.contrapt.jdbcode

import org.junit.Assert.*

class SelectTest2 : AbstractSqlParserTest() {
    override val sql = """select sum(decode(col1, null, 0, 1)) over (partition by col2) from  atable group by acolumn order by 1 """
    //override val sql = """select sum(decode(col1, null, 0, 1)) over (partition by col2 order by col3) from  atable group by acolumn order by 1 """
    override val expectations = listOf(
            Expected.ESelectList(6) {
            },
            Expected.ESelectList(7) {
                assertTrue(it.tableMap.containsKey("atable"))
            },
            Expected.EValueExpr(11) {},
            Expected.EColumnExpr(18) {},
            Expected.EValueExpr(24) {},
            Expected.EValueExpr(30) {},
            Expected.EValueExpr(33) {},
            Expected.EColumnExpr(43) {
            },
            Expected.EColumnExpr(58) {
                assertEquals("col2", it.name)
            },
            Expected.ETableItem(68) {
            },
            Expected.EColumnExpr(85) {
            }
    )
    override val partials = listOf(
            Expected.EColumnExpr(7) {
                assertEquals("s", it.name)
                assertFalse(it.tableMap.containsKey("atable"))
            },
            Expected.EValueExpr(42) {
            },
            Expected.EColumnExpr(58) {
            },
            Expected.ETableItem(69) {
            },
            Expected.EColumnExpr(86) {
                assertTrue(it.tableMap.containsKey("atable"))
            }
    )
}