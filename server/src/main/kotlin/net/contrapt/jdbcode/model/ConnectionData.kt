package net.contrapt.jdbcode.model

data class ConnectionData(
        var name: String = "",
        var driver: String = "",
        var url: String = "",
        var username: String = "",
        var password: String = "",
        var validationQuery: String = "",
        var fetchLimit: Int = 500,
        var autoCommit: Boolean = false,
        var maxPoolSize: Int = 30,
        var includes: Set<String> = setOf(),
        var excludes: Set<String>  = setOf()
)
