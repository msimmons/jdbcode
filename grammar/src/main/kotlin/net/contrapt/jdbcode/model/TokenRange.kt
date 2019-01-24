package net.contrapt.jdbcode.model

data class TokenRange(
        val start: Int,
        val stop: Int,
        val line: Int,
        val lineChar: Int
)
