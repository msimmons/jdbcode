package net.contrapt.jdbcode

sealed class Item {
    abstract val range: TokenRange

    data class SelectList(override val range: TokenRange) : Item()
    data class TableList(override val range: TokenRange) : Item()

    data class TableItem(
            override val range: TokenRange,
            val owner : String,
            val name : String,
            val alias : String
    ) : Item()

    data class ColumnExpr(
            override val range: TokenRange,
            val tableAlias : String,
            val name : String,
            val tableMap: Map<String, TableItem>
    ) : Item()
}

