package net.contrapt.jdbcode.service

import net.contrapt.jdbcode.Item
import net.contrapt.jdbcode.SqlParseListener

class StatementParser {

    val parser = SqlParseListener()

    fun parse(sql: String, char: Int): Item {
        parser.parse(sql)
        return parser.getCaretItem(char)
    }
}