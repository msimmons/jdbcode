package net.contrapt.jdbcode.model

data class SqlResult (
        val id: String,
        val status: StatementStatus = StatementStatus.executing,
        val type: StatementType = StatementType.query,
        val updateCount: Int = -1,
        val moreRows: Boolean = false,
        val executionCount: Int = 0,
        val executionTime: Long = 0,
        val fetchTime: Long = 0,
        val columns: List<String> = listOf(),
        val rows: List<List<Any?>> = listOf(),
        val error: String? = null
)
