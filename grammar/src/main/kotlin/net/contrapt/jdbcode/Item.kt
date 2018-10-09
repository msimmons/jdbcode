package net.contrapt.jdbcode

sealed class Item(val type: String, val range: TokenRange) {

    class NullItem(range: TokenRange) : Item("null", range)

    class TableList(
            range: TokenRange,
            val tableMap: Map<String, TableItem>
    ) : Item("table_list", range)

    class SelectList(
            range: TokenRange,
            val tableMap: Map<String, TableItem>
    ) : Item("select_list", range)

    class TableItem(
            range: TokenRange,
            val owner : String,
            val name : String,
            val alias : String
    ) : Item("table_item", range)

    class ColumnExpr(
            range: TokenRange,
            val tableAlias : String,
            val name : String,
            val tableMap: Map<String, TableItem>
    ) : Item("column_expr", range)

    class SyntaxError(
            range: TokenRange,
            val expected: List<String>
    ) : Item("syntax_error", range)
}

