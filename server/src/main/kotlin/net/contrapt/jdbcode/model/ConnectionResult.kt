package net.contrapt.jdbcode.model

data class ConnectionResult(
        var schemas: MutableSet<SchemaData> = mutableSetOf(),
        var keywords: MutableSet<String> = mutableSetOf(),
        var error: String? = null
)
