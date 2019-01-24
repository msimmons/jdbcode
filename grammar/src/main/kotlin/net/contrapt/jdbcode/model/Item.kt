package net.contrapt.jdbcode.model

sealed class Item(val type: ItemType, val range: TokenRange)

class NullItem(range: TokenRange) : Item(ItemType.NULL, range)

class TableList(
        range: TokenRange,
        val tableMap: Map<String, TableItem>
) : Item(ItemType.TABLE_LIST, range)

class SelectList(
        range: TokenRange,
        val tableMap: Map<String, TableItem>
) : Item(ItemType.SELECT_LIST, range)

class TableItem(
        range: TokenRange,
        val owner: String,
        val name: String,
        val alias: String
) : Item(ItemType.TABLE_ITEM, range)

class ColumnExpr(
        range: TokenRange,
        val tableAlias: String,
        val name: String,
        val tableMap: Map<String, TableItem>
) : Item(ItemType.COLUMN_EXPR, range)

class SyntaxError(
        range: TokenRange,
        val expected: List<String>
) : Item(ItemType.SYNTAX_ERROR, range)

