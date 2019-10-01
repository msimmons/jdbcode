package net.contrapt.jdbcode.handler

import io.vertx.core.Vertx
import io.vertx.core.eventbus.Message
import io.vertx.core.json.JsonObject
import net.contrapt.jdbcode.model.ConnectionData
import net.contrapt.jdbcode.model.DriverData
import net.contrapt.jdbcode.service.ConnectionService

class ConnectHandler(vertx: Vertx, val connectionService: ConnectionService) : AbstractHandler(vertx, true) {

    override fun processMessage(message: Message<JsonObject>): JsonObject {
        val connection = message.body().getJsonObject("connection").mapTo(ConnectionData::class.java)
        val driver = message.body().getJsonObject("driver").mapTo(DriverData::class.java)
        val result = connectionService.connect(connection, driver)
        return JsonObject.mapFrom(result)
    }
}