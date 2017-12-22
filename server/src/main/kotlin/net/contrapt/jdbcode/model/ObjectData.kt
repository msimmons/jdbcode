package net.contrapt.jdbcode.model

interface ObjectData

data class TableData (
        val owner: String = "",
        val name: String = "",
        val type: String = ""
) : ObjectData

data class ProcedureData (
        val owner: String = "",
        val name: String = "",
        val type: Int = 0
) : ObjectData