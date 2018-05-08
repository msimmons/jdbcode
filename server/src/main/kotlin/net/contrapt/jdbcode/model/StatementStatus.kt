package net.contrapt.jdbcode.model

enum class StatementStatus {
    executing,
    executed,
    committed,
    rolledback,
    cancelled
}