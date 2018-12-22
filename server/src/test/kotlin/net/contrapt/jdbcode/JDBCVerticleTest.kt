package net.contrapt.jdbcode

import io.vertx.core.eventbus.Message
import io.vertx.core.json.JsonObject
import io.vertx.ext.unit.TestContext
import io.vertx.ext.unit.junit.RunTestOnContext
import io.vertx.ext.unit.junit.VertxUnitRunner
import net.contrapt.jdbcode.model.*
import net.contrapt.jdbcode.service.ConnectionService
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.*

@RunWith(VertxUnitRunner::class)
open class JDBCVerticleTest {

    @get:Rule
    var rule = RunTestOnContext()

    lateinit var mockConnectionService: ConnectionService
    lateinit var verticle: JDBCVerticle

    @Before
    fun before(context: TestContext) {
        rule.vertx().exceptionHandler(context.exceptionHandler())
        mockConnectionService = mock(ConnectionService::class.java)
        verticle = JDBCVerticle().apply {
            connectionService = mockConnectionService
        }
    }

    @Test
    fun testConnect(context: TestContext) {
        val connection = ConnectionData()
        val driver = DriverData()
        val message = JsonObject()
                .put("connection", JsonObject.mapFrom(connection))
                .put("driver", JsonObject.mapFrom(driver))
        `when`(mockConnectionService.connect(connection, driver)).thenReturn(ConnectionData().apply { schemas.add(SchemaData("name", SchemaType.schema)) })
        rule.vertx().deployVerticle(verticle, context.asyncAssertSuccess(){ _ ->
            rule.vertx().eventBus().send("jdbcode.connect", message, context.asyncAssertSuccess<Message<JsonObject>>() { result ->
                verify(mockConnectionService, times(1)).connect(connection, driver)
                context.assertTrue(result.body().containsKey("schemas"))
                context.assertEquals("name", result.body().getJsonArray("schemas").getJsonObject(0).getString("name"))
            })
        })
    }

    @Test
    fun testConnectError(context: TestContext) {
        val connection = ConnectionData()
        val driver = DriverData()
        val message = JsonObject()
                .put("connection", JsonObject.mapFrom(connection))
                .put("driver", JsonObject.mapFrom(driver))
        `when`(mockConnectionService.connect(connection, driver)).thenThrow(RuntimeException("throwing"))
        rule.vertx().deployVerticle(verticle, context.asyncAssertSuccess(){ _ ->
            rule.vertx().eventBus().send("jdbcode.connect", message, context.asyncAssertFailure<Message<JsonObject>>() { result ->
                context.assertNotNull(result.message, "Should have an error result")
            })
        })
    }

    @Test
    fun testExecute(context: TestContext) {
        val sqlStatement = SqlStatement()
        `when`(mockConnectionService.execute(sqlStatement)).thenReturn(sqlStatement)
        val message = JsonObject.mapFrom(sqlStatement)

        rule.vertx().deployVerticle(verticle, context.asyncAssertSuccess() { _ ->
            rule.vertx().eventBus().send("jdbcode.execute", message, context.asyncAssertSuccess<Message<JsonObject>>() { result ->
                verify(mockConnectionService, times(1)).execute(sqlStatement)
                context.assertEquals(message, result.body())
            })
        })
    }

    @Test
    fun testDisconnect(context: TestContext) {
        val connection = ConnectionData()
        val message = JsonObject.mapFrom(connection)

        rule.vertx().deployVerticle(verticle, context.asyncAssertSuccess(){ _ ->
            rule.vertx().eventBus().send("jdbcode.disconnect", message, context.asyncAssertSuccess<Message<JsonObject>>() { _ ->
                verify(mockConnectionService, times(1)).disconnect(connection)
            })
        })
    }

}