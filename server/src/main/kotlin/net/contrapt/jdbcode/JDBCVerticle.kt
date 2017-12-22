package net.contrapt.jdbcode

import com.fasterxml.jackson.databind.DeserializationFeature
import io.vertx.core.AbstractVerticle
import io.vertx.core.AsyncResult
import io.vertx.core.Future
import io.vertx.core.Handler
import io.vertx.core.json.Json
import io.vertx.core.json.JsonObject
import io.vertx.core.logging.LoggerFactory
import net.contrapt.jdbcode.model.ConnectionData
import net.contrapt.jdbcode.model.DriverData
import net.contrapt.jdbcode.model.SchemaData
import net.contrapt.jdbcode.model.SqlStatement
import net.contrapt.jdbcode.service.ConnectionService

class JDBCVerticle() : AbstractVerticle() {

    private val logger = LoggerFactory.getLogger(javaClass)
    var connectionService = ConnectionService()

    override fun start() {

        Json.mapper.apply {
            configure(DeserializationFeature.FAIL_ON_IGNORED_PROPERTIES, false)
            configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
        }

        /**
         * Request to connect opens a connection pool and returns list of schemas/catalogs available to the
         * connection
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.connect", { message ->
            vertx.executeBlocking(Handler<Future<JsonObject>> { future ->
                var connection = ConnectionData()
                try {
                    connection = message.body().getJsonObject("connection").mapTo(ConnectionData::class.java)
                    val driver = message.body().getJsonObject("driver").mapTo(DriverData::class.java)
                    connection = connectionService.connect(connection, driver)
                    future.complete(JsonObject.mapFrom(connection))
                } catch (e: Exception) {
                    logger.error("Opening a connection", e)
                    connection.error = e.toString()
                    future.complete(JsonObject.mapFrom(connection))
                }
            }, Handler<AsyncResult<JsonObject>> { ar ->
                if (ar.failed()) {
                    logger.error("Connect failed", ar.cause())
                    message.fail(1, ar.cause().toString())
                } else message.reply(ar.result())
            })
        })

        /**
         * Execute the given SQL statement
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.execute", { message ->
            vertx.executeBlocking(Handler<Future<JsonObject>> { future ->
                var sqlStatement = SqlStatement()
                try {
                    sqlStatement = message.body().mapTo(SqlStatement::class.java)
                    val result = connectionService.execute(sqlStatement)
                    future.complete(JsonObject.mapFrom(result))
                } catch (e: Exception) {
                    logger.error("Executing sql statement", e)
                    sqlStatement.error = e.toString()
                    future.complete(JsonObject.mapFrom(sqlStatement))
                }
            }, Handler<AsyncResult<JsonObject>> { ar ->
                if (ar.failed()) message.fail(1, ar.cause().toString())
                else message.reply(ar.result())
            })
        })

        /**
         * Disconnect from the given connection -- closes all statements and the pool
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.disconnect", { message ->
            vertx.executeBlocking(Handler<Future<JsonObject>> { future ->
                try {
                    val connection = message.body().mapTo(ConnectionData::class.java)
                    connectionService.disconnect(connection)
                    future.complete(JsonObject.mapFrom(connection))
                } catch (e: Exception) {
                    future.fail(e)
                }
            }, Handler<AsyncResult<JsonObject>> { ar ->
                if (ar.failed()) message.fail(1, ar.cause().toString())
                else message.reply(ar.result())
            })
        })

        /**
         * Return objects belonging to the given schema/catalog
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.objects", { message ->
            vertx.executeBlocking(Handler<Future<JsonObject>> { future ->
                var schemaData = SchemaData()
                try {
                    val connection = message.body().getJsonObject("connection").mapTo(ConnectionData::class.java)
                    schemaData = message.body().getJsonObject("schema").mapTo(SchemaData::class.java)
                    schemaData = connectionService.objects(connection, schemaData)
                    future.complete(JsonObject.mapFrom(schemaData))
                } catch (e: Exception) {
                    logger.error("getting objects", e)
                    schemaData.error = e.toString()
                    future.complete(JsonObject.mapFrom(schemaData))
                }
            }, Handler<AsyncResult<JsonObject>> { ar ->
                if (ar.failed()) message.fail(1, ar.cause().toString())
                else message.reply(ar.result())
            })
        })

    }
}


