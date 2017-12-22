package net.contrapt.jdbcode.model

data class SchemaData(
        val name: String = "",
        val type: String = "",
        var resolved: Boolean = false,
        val object_types: MutableSet<String> = mutableSetOf(),
        val objects: MutableMap<String, MutableSet<ObjectData>> = mutableMapOf(),
        var error: String? = null
)
