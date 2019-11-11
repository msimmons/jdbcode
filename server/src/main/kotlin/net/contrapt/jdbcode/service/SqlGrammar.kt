package net.contrapt.jdbcode.service

import com.github.h0tk3y.betterParse.combinators.*
import com.github.h0tk3y.betterParse.grammar.Grammar
import com.github.h0tk3y.betterParse.grammar.parseToEnd
import com.github.h0tk3y.betterParse.parser.Parser
import net.contrapt.jdbcode.service.SqlGrammar.getValue
import net.contrapt.jdbcode.service.SqlGrammar.provideDelegate

object SqlGrammar : Grammar<String>() {

    private fun keyword(token: String) = "${token}\\b".toRegex(RegexOption.IGNORE_CASE)

    // KEYWORD TOKENS
    val CREATE by token(keyword("create"))
    val DROP by token(keyword("drop"))
    val SELECT by token(keyword("select"))
    val FROM by token(keyword("from"))
    val WHERE by token(keyword("where"))
    val ORDER by token(keyword("order"))
    val GROUP by token(keyword("group"))
    val HAVING by token(keyword("having"))
    val BY by token(keyword("by"))
    val INSERT by token(keyword("insert"))
    val INTO by token(keyword("into"))
    val VALUES by token(keyword("values"))
    val UPDATE by token(keyword("update"))
    val SET by token(keyword("set"))
    val DELETE by token(keyword("delete"))

    // OTHER TOKENS
    val ID by token("[A-Za-z]\\w*")
    val WS by token("\\s+", ignore = true)
    val NL by token("[\r\n]+", ignore = true)
    val DOT by token(".", ignore = true)
    val QUOTE by token("\"", ignore = true)
    val COMMA by token(",", ignore = true)

    // RULES
    val qId : Parser<String> by (optional(QUOTE) * ID * optional(QUOTE)).map { it.t2.text }
    val fqId : Parser<String> by (separated(qId, DOT, false)).map { it.terms.joinToString { it } }
    val select : Parser<String> by (SELECT * zeroOrMore(fqId) * FROM * zeroOrMore(ID)).map {  it.t2.joinToString { it } }
    val insert : Parser<String> by (INSERT * INTO * ID * VALUES * zeroOrMore(ID)).map { "" }
    val statement : Parser<String> by (SELECT * zeroOrMore(ID) * FROM * zeroOrMore(ID)).map { it.t2.joinToString { it.text } }

    override val rootParser: Parser<String> by statement

    @JvmStatic
    fun main(args: Array<String>) {
        println(parseToEnd("SelEct \"a\".\"blah\" from bar"))
    }
}