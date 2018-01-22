package net.contrapt.jdbcode.model

data class ParameterData(
        val name: String = "",
        val type: String = "",
        val dataType: Int = 0,
        val inOut: String = "",
        val default: String? = null,
        val position: Int = 0,
        val nullable: String = ""
)