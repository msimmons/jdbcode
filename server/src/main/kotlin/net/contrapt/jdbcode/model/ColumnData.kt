package net.contrapt.jdbcode.model

data class ColumnData (
        val name: String = "",
        val type: String = "",
        val dataType: Int = 0,
        val size: Int = 0,
        val default: String? = null,
        val position: Int = 0,
        val nullable: String = "",
        val autoincrement: String = "",
        var keySequence: Int? = null,
        var references: String? = null
)