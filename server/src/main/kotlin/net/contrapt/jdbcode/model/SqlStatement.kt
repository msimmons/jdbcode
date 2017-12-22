package net.contrapt.jdbcode.model

data class SqlStatement (
        var id: String = "",
        var connection: String = "",
        var sql: String = "",
        var updateCount: Int = -1,
        var moreRows: Boolean = false,
        var executionCount: Int = 0,
        var executionTime: Long = 0,
        var fetchTime: Long = 0,
        var columns: List<String> = listOf(),
        var rows: List<List<Any?>> = listOf(),
        var error: String? = null
)
