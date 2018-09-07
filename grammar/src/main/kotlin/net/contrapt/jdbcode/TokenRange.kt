package net.contrapt.jdbcode

data class TokenRange(
        val start: Int,
        val stop: Int,
        val line: Int,
        val lineChar: Int
)
