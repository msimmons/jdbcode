package net.contrapt.jdbcode.model

data class ConnectionData(
        var name: String = "",
        var url: String = "",
        var username: String = "",
        var password: String = "",
        var validationQuery: String = "",
        var fetchLimit: Int = 500,
        var autoCommit: Boolean = false,
        var includeCatalogs: Boolean = false,
        var excludes: Set<String>  = setOf(),
        var schemas: MutableSet<SchemaData> = mutableSetOf(),
        var keywords: MutableSet<String> = mutableSetOf(),
        var error: String? = null
)
