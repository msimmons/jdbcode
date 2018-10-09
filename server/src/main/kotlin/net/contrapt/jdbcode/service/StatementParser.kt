package net.contrapt.jdbcode.service

import net.contrapt.jdbcode.Item
import net.contrapt.jdbcode.SqlParseListener

class StatementParser {

    val parser = SqlParseListener()

    fun parse(sql: String, char: Int): Item {
        parser.parse(sql)
        val item = parser.getCaretItem(char)
        return when (item) {
            is Item.NullItem, is Item.SyntaxError -> if (char > 0) parser.getCaretItem(char - 1) else item
            else -> item
        }
    }
}