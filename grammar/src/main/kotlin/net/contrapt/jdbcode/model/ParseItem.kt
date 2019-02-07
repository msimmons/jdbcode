package net.contrapt.jdbcode.model

sealed class ParseItem(val type: ItemType, val range: TokenRange)

class NullItem(range: TokenRange) : ParseItem(ItemType.NULL, range)

class TableItem(
        range: TokenRange,
        val owner: String,
        val name: String,
        val alias: String
) : ParseItem(ItemType.TABLE_ITEM, range)

class ColumnExpr(
        range: TokenRange,
        val tableAlias: String,
        val name: String,
        val tableMap: Map<String, TableItem>
) : ParseItem(ItemType.COLUMN_EXPR, range)

class ValueExpr(
        range: TokenRange,
        val tableMap: Map<String, TableItem>
) : ParseItem(ItemType.VALUE_EXPR, range)

class SyntaxError(
        range: TokenRange,
        val expected: List<String>
) : ParseItem(ItemType.SYNTAX_ERROR, range)

