package net.contrapt.jdbcode.fixture

import org.junit.Assert.assertEquals

object DeleteFixture1 : Fixture {
    override val sql = """delete from tofu where id = 3"""
    override val expectations = listOf(
            Expected.TableItem(13){
                assertEquals("tofu", it.name)
            },
            Expected.ColumnExpr(24) {
                assertEquals("Column name", "id", it.name)
                assertEquals("tofu", it.tableMap["tofu"]?.name)
            }
    )
    override val partials = listOf<Expected<*>>()

}