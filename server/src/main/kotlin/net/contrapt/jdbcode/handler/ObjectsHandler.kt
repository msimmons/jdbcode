package net.contrapt.jdbcode.handler

import io.vertx.core.Vertx
import io.vertx.core.eventbus.Message
import io.vertx.core.json.JsonObject
import net.contrapt.jdbcode.model.ConnectionData
import net.contrapt.jdbcode.model.SchemaData
import net.contrapt.jdbcode.service.ConnectionService

class ObjectsHandler(vertx: Vertx, val connectionService: ConnectionService) : AbstractHandler(vertx, true) {

    override fun processMessage(message: Message<JsonObject>): JsonObject {
        var schemaData = SchemaData()
        try {
            val connection = message.body().getJsonObject("connection").mapTo(ConnectionData::class.java)
            schemaData = message.body().getJsonObject("schema").mapTo(SchemaData::class.java)
            schemaData = connectionService.objects(connection, schemaData)
            return JsonObject.mapFrom(schemaData)
        } catch (e: Exception) {
            logger.error("Getting objects", e)
            schemaData.error = e.toString()
            return JsonObject.mapFrom(schemaData)
        }
    }
}