package net.contrapt.jdbcode.fixture

interface Fixture {
    val sql: String
    val expectations: List<Expected<*>>
    val partials: List<Expected<*>>
}
