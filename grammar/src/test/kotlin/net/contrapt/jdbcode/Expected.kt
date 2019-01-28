package net.contrapt.jdbcode

import net.contrapt.jdbcode.model.*
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import kotlin.reflect.KClass

sealed class Expected<T: ParseItem>(val col: Int, val klass: KClass<T>) {

    fun test(parseItem: ParseItem) {
        return when (parseItem) {
            is NullItem -> testNullItem(parseItem)
            is ColumnExpr -> testColumnExpr(parseItem)
            is ValueExpr -> testValueExpr(parseItem)
            is SelectList -> testSelectList(parseItem)
            is TableList -> testTableList(parseItem)
            is TableItem -> testTableItem(parseItem)
            is SyntaxError -> testSyntaxError(parseItem)
        }
    }

    open protected val testNullItem: (NullItem) -> Unit = {assertClass(it)}
    open protected val testColumnExpr: (ColumnExpr) -> Unit = {assertClass(it)}
    open protected val testValueExpr: (ValueExpr) -> Unit = {assertClass(it)}
    open protected val testSelectList: (SelectList) -> Unit = {assertClass(it)}
    open protected val testTableList: (TableList) -> Unit = {assertClass(it)}
    open protected val testTableItem: (TableItem) -> Unit = {assertClass(it)}
    open protected val testSyntaxError: (SyntaxError) -> Unit = {assertClass(it)}

    private fun assertClass(parseItem: ParseItem?) {
        when (parseItem) {
            null -> assertTrue("Expected $klass got null at $col", false)
            else -> assertEquals("Expected class at $col", klass, parseItem::class)
        }
    }

    class ENullItem(col: Int, override val testNullItem: (ParseItem?) -> Unit) : Expected<ParseItem>(col, ParseItem::class)
    class EColumnExpr(col: Int, override val testColumnExpr: (ColumnExpr) -> Unit) : Expected<ColumnExpr>(col, ColumnExpr::class)
    class EValueExpr(col: Int, override val testValueExpr: (ValueExpr) -> Unit) : Expected<ValueExpr>(col, ValueExpr::class)
    class ESelectList(col: Int, override val testSelectList: (SelectList) -> Unit) : Expected<SelectList>(col, SelectList::class)
    class ETableList(col: Int, override val testTableList: (TableList) -> Unit) : Expected<TableList>(col, TableList::class)
    class ETableItem(col: Int, override val testTableItem: (TableItem) -> Unit) : Expected<TableItem>(col, TableItem::class)


}


