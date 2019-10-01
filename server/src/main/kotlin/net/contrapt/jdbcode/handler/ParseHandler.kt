package net.contrapt.jdbcode.handler

import io.vertx.core.Vertx
import io.vertx.core.eventbus.Message
import io.vertx.core.json.JsonObject
import net.contrapt.jdbcode.service.StatementParser

class ParseHandler(vertx: Vertx, val parser: StatementParser) : AbstractHandler(vertx) {

    override fun processMessage(message: Message<JsonObject>): JsonObject {
        val sql = message.body().getString("sql")
        val char = message.body().getInteger("char")
        val item = parser.parse(sql, char)
        return JsonObject.mapFrom(item)
    }
}