package net.contrapt.jdbcode

import com.fasterxml.jackson.databind.DeserializationFeature
import io.vertx.core.AbstractVerticle
import io.vertx.core.json.Json
import io.vertx.core.json.JsonObject
import net.contrapt.jdbcode.handler.*
import net.contrapt.jdbcode.service.ConnectionService
import net.contrapt.jdbcode.service.StatementParser

class JDBCVerticle() : AbstractVerticle() {

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
        vertx.eventBus().consumer<JsonObject>("jdbcode.connect", ConnectHandler(vertx, connectionService))

        /**
         * Request to refresh schema information for the given connection
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.refresh", RefreshHandler(vertx, connectionService))

        /**
         * Execute the given SQL statement
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.execute", ExecuteHandler(vertx, connectionService))

        /**
         * Fetch additional results from the given SQL statement
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.fetch", FetchHandler(vertx, connectionService))

        /**
         * Re-execute (reexecute) the given SQL statement
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.reexecute", ReExecuteHandler(vertx, connectionService))

        /**
         * Cancel the given SQL statement (if possible)
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.cancel", CancelHandler(vertx, connectionService))

        /**
         * Commit the given SQL statement
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.commit", CommitHandler(vertx, connectionService))

        /**
         * Rollback the given SQL statement
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.rollback", RollbackHandler(vertx, connectionService))

        /**
         * Close the given SQL statement
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.close", CloseHandler(vertx, connectionService))

        /**
         * Disconnect from the given connection -- closes all statements and the pool
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.disconnect", DisconnectHandler(vertx, connectionService))

        /**
         * Return objects belonging to the given schema/catalog
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.objects", ObjectsHandler(vertx, connectionService))

        /**
         * Describe the given object ( table, index columns; procedure params etc)
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.describe", DescribeHandler(vertx, connectionService))

        /**
         * Parse the given sql statement
         */
        vertx.eventBus().consumer<JsonObject>("jdbcode.parse", ParseHandler(vertx, parseService))

    }
}


