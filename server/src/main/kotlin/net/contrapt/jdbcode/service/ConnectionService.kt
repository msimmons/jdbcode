package net.contrapt.jdbcode.service

import net.contrapt.jdbcode.model.ConnectionData
import net.contrapt.jdbcode.model.DriverData
import net.contrapt.jdbcode.model.SchemaData
import net.contrapt.jdbcode.model.SqlStatement
import org.apache.tomcat.jdbc.pool.DataSource
import org.apache.tomcat.jdbc.pool.PoolProperties

/**
 * Manage connection dataSources
 */
open class ConnectionService {

    private val dataSources = mutableMapOf<String, DataSource>()
    private val configs = mutableMapOf<String, ConnectionData>()
    private val statements = mutableMapOf<String, StatementExecutor>()
    private val schemaDesriber = SchemaDescriber()

    open fun connect(connection: ConnectionData, driver: DriverData) : ConnectionData {
        if ( dataSources.containsKey(connection.name)) disconnect(connection)
        val config = PoolProperties().apply {
            url = connection.url
            username = connection.username
            password = connection.password
            validationQuery = connection.validationQuery
            isTestOnBorrow = true
            driverClassName = driver.driverClass
            initialSize = 1
        }
        val dataSource = DataSource(config)
        configs.put(connection.name, connection)
        dataSources.put(connection.name, dataSource)
        connection.schemas.addAll(schemaDesriber.getSchemas(dataSource))
        return connection
    }

    open fun disconnect(connection: ConnectionData) {
        val dataSource = dataSources.remove(connection.name)
        dataSource?.close(true)
    }

    open fun execute(sqlStatement: SqlStatement): SqlStatement {
        val config = configs[sqlStatement.connection] ?:
                throw IllegalArgumentException("Unknown connection ${sqlStatement.connection}")
        val dataSource = dataSources[sqlStatement.connection] ?:
                throw IllegalArgumentException("No pool found for ${sqlStatement.connection}")
        val connection = dataSource.connection
        val statement = StatementExecutor(config, connection, sqlStatement)
        statements[sqlStatement.id] = statement
        statement.execute()
        return statement.fetch()
    }

    open fun objects(connection: ConnectionData, schemaData: SchemaData): SchemaData {
        val dataSource = dataSources[connection.name] ?:
                throw IllegalArgumentException("No pool found for ${connection.name}")
        return schemaDesriber.getObjects(dataSource, schemaData)
    }

}