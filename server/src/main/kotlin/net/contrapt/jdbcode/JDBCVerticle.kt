package net.contrapt.jdbcode

import com.fasterxml.jackson.databind.DeserializationFeature
import io.vertx.core.AbstractVerticle
import io.vertx.core.AsyncResult
import io.vertx.core.Future
import io.vertx.core.Handler
import io.vertx.core.json.Json
import io.vertx.core.json.JsonObject
import io.vertx.core.logging.LoggerFactory
import net.contrapt.jdbcode.model.*
import net.contrapt.jdbcode.service.ConnectionService
import net.contrapt.jdbcode.service.StatementParser

class JDBCVerticle() : AbstractVerticle() {

    private val logger = LoggerFactory.getLogger(javaClass)
    var connectionService = ConnectionService()
    val parseService = StatementParser()

    override fun start() {

        Json.mapper.apply {
            configure(DeserializationFeature.FAIL_ON_IGNORED_PROPERTIES, false)
            configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
        }

        /**
         * Request to connect opens a connection pool and returns list of schemas/catalogs available to the
         * connection
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.connect") { message ->
            vertx.executeBlocking(Handler<Future<JsonObject>> { future ->
                var connection : ConnectionData
                try {
                    connection = message.body().getJsonObject("connection").mapTo(ConnectionData::class.java)
                    val driver = message.body().getJsonObject("driver").mapTo(DriverData::class.java)
                    connection = connectionService.connect(connection, driver)
                    future.complete(JsonObject.mapFrom(connection))
                } catch (e: Exception) {
                    logger.error("Opening a connection", e)
                    future.fail(e)
                }
            }, false, Handler<AsyncResult<JsonObject>> { ar ->
                if (ar.failed()) {
                    logger.error("Connect failed", ar.cause())
                    message.fail(1, ar.cause().toString())
                } else message.reply(ar.result())
            })
        }

        /**
         * Execute the given SQL statement
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.execute") { message ->
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
            }, false, Handler<AsyncResult<JsonObject>> { ar ->
                if (ar.failed()) message.fail(1, ar.cause().toString())
                else message.reply(ar.result())
            })
        }

        /**
         * Re-execute (reexecute) the given SQL statement
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.reexecute") { message ->
            vertx.executeBlocking(Handler<Future<JsonObject>> { future ->
                try {
                    val id = message.body().getString("id")
                    val result = connectionService.reexecute(id)
                    future.complete(JsonObject.mapFrom(result))
                } catch (e: Exception) {
                    logger.error("Re-executing sql statement", e)
                    future.fail(e)
                }
            }, false, Handler<AsyncResult<JsonObject>> { ar ->
                if (ar.failed()) message.fail(1, ar.cause().toString())
                else message.reply(ar.result())
            })
        }

        /**
         * Cancel the given SQL statement (if possible)
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.cancel") { message ->
            vertx.executeBlocking(Handler<Future<JsonObject>> { future ->
                try {
                    val id = message.body().getString("id")
                    val result = connectionService.cancel(id)
                    future.complete(JsonObject.mapFrom(result))
                } catch (e: Exception) {
                    logger.error("Cancelling sql statement", e)
                    future.fail(e)
                }
            }, false, Handler<AsyncResult<JsonObject>> { ar ->
                if (ar.failed()) message.fail(1, ar.cause().toString())
                else message.reply(ar.result())
            })
        }

        /**
         * Commit the given SQL statement
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.commit") { message ->
            vertx.executeBlocking(Handler<Future<JsonObject>> { future ->
                try {
                    val id = message.body().getString("id")
                    val result = connectionService.commit(id)
                    future.complete(JsonObject.mapFrom(result))
                } catch (e: Exception) {
                    logger.error("Committing sql statement", e)
                    future.fail(e)
                }
            }, false, Handler<AsyncResult<JsonObject>> { ar ->
                if (ar.failed()) message.fail(1, ar.cause().toString())
                else message.reply(ar.result())
            })
        }

        /**
         * Rollback the given SQL statement
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.rollback") { message ->
            vertx.executeBlocking(Handler<Future<JsonObject>> { future ->
                try {
                    val id = message.body().getString("id")
                    val result = connectionService.rollback(id)
                    future.complete(JsonObject.mapFrom(result))
                } catch (e: Exception) {
                    logger.error("Rolling back sql statement", e)
                    future.fail(e)
                }
            }, false, Handler<AsyncResult<JsonObject>> { ar ->
                if (ar.failed()) message.fail(1, ar.cause().toString())
                else message.reply(ar.result())
            })
        }

        /**
         * Close the given SQL statement
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.close") { message ->
            vertx.executeBlocking(Handler<Future<JsonObject>> { future ->
                try {
                    val id = message.body().getString("id")
                    val result = connectionService.close(id)
                    future.complete(JsonObject.mapFrom(result))
                } catch (e: Exception) {
                    logger.error("Closing sql statement", e)
                    future.fail(e)
                }
            }, false, Handler<AsyncResult<JsonObject>> { ar ->
                if (ar.failed()) message.fail(1, ar.cause().toString())
                else message.reply(ar.result())
            })
        }

        /**
         * Disconnect from the given connection -- closes all statements and the pool
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.disconnect") { message ->
            vertx.executeBlocking(Handler<Future<JsonObject>> { future ->
                try {
                    val connection = message.body().mapTo(ConnectionData::class.java)
                    connectionService.disconnect(connection)
                    future.complete(JsonObject.mapFrom(connection))
                } catch (e: Exception) {
                    future.fail(e)
                }
            }, false, Handler<AsyncResult<JsonObject>> { ar ->
                if (ar.failed()) message.fail(1, ar.cause().toString())
                else message.reply(ar.result())
            })
        }

        /**
         * Return objects belonging to the given schema/catalog
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.objects") { message ->
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
            }, false, Handler<AsyncResult<JsonObject>> { ar ->
                if (ar.failed()) message.fail(1, ar.cause().toString())
                else message.reply(ar.result())
            })
        }

        /**
         * Describe the given object ( table, index columns; procedure params etc)
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.describe") { message ->
            vertx.executeBlocking(Handler<Future<JsonObject>> { future ->
                try {
                    val connectionData = message.body().getJsonObject("connection").mapTo(ConnectionData::class.java)
                    var objectData = message.body().getJsonObject("dbObject").mapTo(ObjectData::class.java)
                    objectData = connectionService.describe(connectionData, objectData)
                    future.complete(JsonObject.mapFrom(objectData))
                } catch (e: Exception) {
                    logger.error("getting objects", e)
                    future.fail(e)
                }
            }, false, Handler<AsyncResult<JsonObject>> { ar ->
                if (ar.failed()) message.fail(1, ar.cause().toString())
                else message.reply(ar.result())
            })
        }

        /**
         * Parse the given sql statement
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.parse") { message ->
            vertx.executeBlocking(Handler<Future<JsonObject>> { future ->
                try {
                    val sql = message.body().getString("sql")
                    val char = message.body().getInteger("char")
                    val item = parseService.parse(sql, char)
                    future.complete(JsonObject.mapFrom(item))
                } catch (e: Exception) {
                    logger.error("parsing sql", e)
                    future.fail(e)
                }
            }, false, Handler<AsyncResult<JsonObject>> { ar ->
                if (ar.failed()) message.fail(1, ar.cause().toString())
                else message.reply(ar.result())
            })
        }

    }
}


