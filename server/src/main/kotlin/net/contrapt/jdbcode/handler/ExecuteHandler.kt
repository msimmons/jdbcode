package net.contrapt.jdbcode.handler

import io.vertx.core.Vertx
import io.vertx.core.eventbus.Message
import io.vertx.core.json.JsonObject
import net.contrapt.jdbcode.model.SqlResult
import net.contrapt.jdbcode.model.SqlStatement
import net.contrapt.jdbcode.service.ConnectionService

class ExecuteHandler(vertx: Vertx, val connectionService: ConnectionService) : AbstractHandler(vertx, true) {

    override fun processMessage(message: Message<JsonObject>): JsonObject {
        val sqlStatement = message.body().mapTo(SqlStatement::class.java)
        try {
            val result = connectionService.execute(sqlStatement)
            return JsonObject.mapFrom(result)
        } catch (e: Exception) {
            logger.error("Executing sql statement", e)
            return JsonObject.mapFrom(SqlResult(sqlStatement.id, error = e.toString()))
        }
    }
}