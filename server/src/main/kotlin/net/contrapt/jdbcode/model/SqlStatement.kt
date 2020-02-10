package net.contrapt.jdbcode.model

data class SqlStatement (
    var id: String = "",
    var connection: String = "",
    var sql: String = "",
    var suppressTxn: Boolean = false
)
