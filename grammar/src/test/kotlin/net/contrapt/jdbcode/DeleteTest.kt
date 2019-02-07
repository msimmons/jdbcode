package net.contrapt.jdbcode

import net.contrapt.jdbcode.model.ColumnExpr
import net.contrapt.jdbcode.model.TableItem
import org.junit.Assert.assertEquals

class DeleteTest : SqlParserTest() {
    override val sql = """delete from tofu where id = 3"""
    override val expectations = listOf(
            expectedItem(13, TableItem::class){
                assertEquals("tofu", it.name)
            },
            expectedItem(24, ColumnExpr::class) {
                assertEquals("Column name", "id", it.name)
                assertEquals("tofu", it.tableMap["tofu"]?.name)
            }
    )
    override val partials = listOf<ExpectedItem>(
            expectedItem(13, TableItem::class){
            },
            expectedItem(24, ColumnExpr::class) {
                assertEquals("Column name", "id", it.name)
                assertEquals("tofu", it.tableMap["tofu"]?.name)
            }
    )
}