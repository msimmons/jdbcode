package net.contrapt.jdbcode.service

import net.contrapt.jdbcode.model.*
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
        connection.schemas.addAll(schemaDesriber.getSchemas(connection, dataSource))
        connection.keywords.addAll(schemaDesriber.getKeywords(dataSource))
        return connection
    }

    open fun disconnect(connection: ConnectionData) {
        closeStatements(connection)
        val dataSource = dataSources.remove(connection.name)
        dataSource?.close(true)
    }

    private fun closeStatements(connection: ConnectionData) {
        val removeKeys = statements.filter { it.value.config.name == connection.name }.map { it.key }
        removeKeys.forEach {
            try {
                statements[it]?.close()
            }
            finally {
                statements.remove(it)
            }
        }
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

    open fun refresh(id: String) : SqlStatement {
        val statement = statements[id] ?: throw IllegalArgumentException("Unknown statement id $id")
        statement.execute()
        return statement.fetch()
    }

    open fun objects(connection: ConnectionData, schemaData: SchemaData): SchemaData {
        val dataSource = dataSources[connection.name] ?:
                throw IllegalArgumentException("No pool found for ${connection.name}")
        return schemaDesriber.getObjects(dataSource, schemaData)
    }

    fun cancel(id: String): SqlStatement {
        val statement = statements[id] ?: throw IllegalArgumentException("Unknown statement id $id")
        statement.cancel()
        return statement.fetch()
    }

    fun commit(id: String): SqlStatement {
        val statement = statements[id] ?: throw IllegalArgumentException("Unknown statement id $id")
        return statement.commit()
    }

    fun rollback(id: String): SqlStatement {
        val statement = statements[id] ?: throw IllegalArgumentException("Unknown statement id $id")
        return statement.rollback()
    }

    fun close(id: String): SqlStatement {
        val statement = statements.remove(id) ?: throw IllegalArgumentException("Unknown statement id $id")
        return statement.close()
    }

    open fun describe(connection: ConnectionData, objectData: ObjectData): ObjectData {
        val dataSource = dataSources[connection.name] ?:
                throw IllegalArgumentException("No pool found for ${connection.name}")
        return schemaDesriber.describeObject(dataSource, objectData)
    }

}