package net.contrapt.jdbcode.service

import net.contrapt.jdbcode.SqlParseListener
import net.contrapt.jdbcode.model.ParseItem
import net.contrapt.jdbcode.model.NullItem
import net.contrapt.jdbcode.model.SyntaxError

class StatementParser {

    val parser = SqlParseListener()

    fun parse(sql: String, char: Int): ParseItem {
        parser.parse(sql)
        val item = parser.getCaretItem(char)
        return when (item) {
            is NullItem, is SyntaxError -> if (char > 0) parser.getCaretItem(char - 1) else item
            else -> item
        }
    }
}