package net.contrapt.jdbcode.handler

import io.vertx.core.Vertx
import io.vertx.core.eventbus.Message
import io.vertx.core.json.JsonObject
import net.contrapt.jdbcode.model.ConnectionData
import net.contrapt.jdbcode.model.ObjectData
import net.contrapt.jdbcode.service.ConnectionService

class DescribeHandler(vertx: Vertx, val connectionService: ConnectionService) : AbstractHandler(vertx, true) {

    override fun processMessage(message: Message<JsonObject>): JsonObject {
        val connectionData = message.body().getJsonObject("connection").mapTo(ConnectionData::class.java)
        var objectData = message.body().getJsonObject("dbObject").mapTo(ObjectData::class.java)
        objectData = connectionService.describe(connectionData, objectData)
        return JsonObject.mapFrom(objectData)
    }
}