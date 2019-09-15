package net.contrapt.jdbcode.handler

import io.vertx.core.Vertx
import io.vertx.core.eventbus.Message
import io.vertx.core.json.JsonObject
import net.contrapt.jdbcode.service.ConnectionService

class ReExecuteHandler(vertx: Vertx, val connectionService: ConnectionService) : AbstractHandler(vertx, true) {

    override fun processMessage(message: Message<JsonObject>): JsonObject {
        val id = message.body().getString("id")
        val result = connectionService.reexecute(id)
        return JsonObject.mapFrom(result)
    }
}