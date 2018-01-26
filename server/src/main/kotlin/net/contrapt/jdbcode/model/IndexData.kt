package net.contrapt.jdbcode.model

data class IndexData(
        val name: String = "",
        val unique: Boolean = false,
        val position: Int = 0,
        val direction: String = "",
        val filter: String? = null
)