package net.contrapt.jdbcode.fixture

import net.contrapt.jdbcode.Item
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import kotlin.reflect.KClass

sealed class Expected<T: Item>(val col: Int, val klass: KClass<T>) {

    fun test(item: Item?) {
        return when (item) {
            null -> testNullItem(item)
            is Item.ColumnExpr -> testColumnExpr(item)
            is Item.SelectList -> testSelectList(item)
            is Item.TableList -> testTableList(item)
            is Item.TableItem -> testTableItem(item)
        }
    }

    open protected val testNullItem: (Item?) -> Unit = {assertClass(it)}
    open protected val testColumnExpr: (Item.ColumnExpr) -> Unit = {assertClass(it)}
    open protected val testSelectList: (Item.SelectList) -> Unit = {assertClass(it)}
    open protected val testTableList: (Item.TableList) -> Unit = {assertClass(it)}
    open protected val testTableItem: (Item.TableItem) -> Unit = {assertClass(it)}

    private fun assertClass(item: Item?) {
        when (item) {
            null -> assertTrue("Expected $klass got null at $col", false)
            else -> assertEquals("Expected class at $col", klass, item::class)
        }
    }

    class NullItem(col: Int, override val testNullItem: (Item?) -> Unit) : Expected<Item>(col, Item::class)
    class ColumnExpr(col: Int, override val testColumnExpr: (Item.ColumnExpr) -> Unit) : Expected<Item.ColumnExpr>(col, Item.ColumnExpr::class)
    class SelectList(col: Int, override val testSelectList: (Item.SelectList) -> Unit) : Expected<Item.SelectList>(col, Item.SelectList::class)
    class TableList(col: Int, override val testTableList: (Item.TableList) -> Unit) : Expected<Item.TableList>(col, Item.TableList::class)
    class TableItem(col: Int, override val testTableItem: (Item.TableItem) -> Unit) : Expected<Item.TableItem>(col, Item.TableItem::class)


}


