package net.contrapt.jdbcode.service

import com.github.h0tk3y.betterParse.combinators.*
import com.github.h0tk3y.betterParse.grammar.Grammar
import com.github.h0tk3y.betterParse.grammar.parseToEnd
import com.github.h0tk3y.betterParse.grammar.parser
import com.github.h0tk3y.betterParse.parser.Parser

/**
 * 
 file {
   scope(start, end) {
     symbol(start, end, type, fqn)
     .
     .
     scope(start, end) {
      symbol(start, end, ...)
     }
   }
 }
 */
object SqlGrammar : Grammar<String>() {

    private fun keyword(token: String) = "${token}\\b".toRegex(RegexOption.IGNORE_CASE)

    // KEYWORD TOKENS
    val CREATE by token(keyword("create"))
    val ALTER by token(keyword("alter"))
    val DROP by token(keyword("drop"))
    val SELECT by token(keyword("select"))
    val FROM by token(keyword("from"))
    val WHERE by token(keyword("where"))
    val ORDER by token(keyword("order"))
    val GROUP by token(keyword("group"))
    val HAVING by token(keyword("having"))
    val BY by token(keyword("by"))
    val INSERT by token(keyword("insert"))
    val MERGE by token(keyword("merge"))
    val INTO by token(keyword("into"))
    val VALUES by token(keyword("values"))
    val UPDATE by token(keyword("update"))
    val SET by token(keyword("set"))
    val DELETE by token(keyword("delete"))
    val IS by token(keyword("is"))
    val NULL by token(keyword("null"))
    val TRUE by token(keyword("true"))
    val FALSE by token(keyword("false"))

    // Identifiers
    val ID by token("[A-Za-z]\\w*")
    val QID by token("\"([^\"])*\"")

    // Literals
    val STRING_LITERAL by token("'([^']|'')*'")
    val NUMERIC_LITERAL by token("([-]?[0-9]+(\\.[0-9]*)?(E[-+]?[0-9]+)?)|([-]?\\.[0-9]+(E[-+]?[0-9]+)?)")
    // Are date and time literals a thing or are they normally expressed as strings?

    // Other tokens
    val WS by token("\\s+", ignore = true)
    val NL by token("[\r\n]+", ignore = true)
    val DOT by token("\\.", ignore = true)
    val QUOTE by token("\"", ignore = true)
    val COMMA by token(",", ignore = true)
    val LPAREN by token("\\(")
    val RPAREN by token("\\)")
    val PERCENT by token("%")
    val AMP by token("&")
    val ASTERISK by token("\\*")

    // RULES
    val id : Parser<String> by (QID or ID).map { "${it.type.name}[${it.text}]" } // Optionally Quoted ID
    val fqId : Parser<String> by (separated(id, DOT, false)).map { it.terms.joinToString { it } } // Fully Qualified ID
    val literal : Parser<String> by (NULL or TRUE or FALSE or STRING_LITERAL or NUMERIC_LITERAL).map { "${it.type.name}[${it.text}]" } // A literal

    val simpleExpression : Parser<String> by (fqId or literal)
    val functionExpression : Parser<String> by (fqId * LPAREN * separated(parser(::valueExpression), COMMA, true) * RPAREN).map { it.t1 }
    val blockKeyword : Parser<String> by (ORDER or BY or COMMA).map { it.text }
    val blockExpression : Parser<String> by (LPAREN * zeroOrMore(parser(::valueExpression) or blockKeyword) * RPAREN).map { "BLOCK[${it.t2.size}]" }

    val valueExpression : Parser<String> by (blockExpression or functionExpression or simpleExpression).map { it }

    //val selectExpression : Parser<String> by ()

    val select : Parser<String> by (SELECT * zeroOrMore(fqId) * FROM * zeroOrMore(ID)).map {  it.t2.joinToString { it } }
    val insert : Parser<String> by (INSERT * INTO * ID * VALUES * zeroOrMore(ID)).map { "" }

    val statement : Parser<String> by (SELECT * zeroOrMore(fqId) * FROM * zeroOrMore(ID)).map { it.t2.joinToString { it } }

    val idOrLiteral : Parser<String> by oneOrMore(valueExpression).map { it.joinToString { it } }

    override val rootParser: Parser<String> by idOrLiteral

    @JvmStatic
    fun main(args: Array<String>) {
        val sql = listOf(
                "SelEct \"a\".\"blah\" from bar",
                "case id then 3 else 15 end",
                "id over (partition by id order by id)",
                "'This is a string''s literal' anid fe.id \"quoted id name\".id 'another literal' 9.0 9.99 .0109 1.01E-10 -1 -34E10 null '' concat(1,2,3,id.foo)",
                "concat(1,32,1) substr(concat(12,232)) over (partition by foo.bar, max(1,2) order by 1, 2) case when 3 then 4 else 5 end"
        )
        println(parseToEnd(sql[4]))
    }
}