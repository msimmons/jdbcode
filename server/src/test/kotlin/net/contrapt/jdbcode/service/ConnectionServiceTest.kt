package net.contrapt.jdbcode.service

import net.contrapt.jdbcode.model.ConnectionData
import net.contrapt.jdbcode.model.DriverData
import org.junit.Test

class ConnectionServiceTest {

    @Test
    fun testH2() {
        val service = ConnectionService()
        val connection = ConnectionData("h2", "h2", "jdbc:h2:mem:test", "sa", "", "")
        val driverData = DriverData("h2", "org.h2.Driver", "")
        val connectionData = service.connect(connection, driverData)
        connectionData.schemas.forEach { s ->
            service.objects(connection, s)
        }
        val schema = connectionData.schemas.find { it.name == "INFORMATION_SCHEMA" }
        schema?.objectTypes?.forEach {
            it.objects.forEach {
                service.describe(connection, it)
            }
        }
    }
}