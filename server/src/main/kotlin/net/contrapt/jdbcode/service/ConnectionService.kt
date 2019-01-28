package net.contrapt.jdbcode.service

import com.zaxxer.hikari.HikariDataSource
import net.contrapt.jdbcode.model.*

/**
 * Manage connection dataSources
 */
open class ConnectionService {

    private val dataSources = mutableMapOf<String, HikariDataSource>()
    private val configs = mutableMapOf<String, ConnectionData>()
    private val statements = mutableMapOf<String, StatementExecutor>()
    private val schemaDesriber = SchemaDescriber()

    open fun connect(connection: ConnectionData, driver: DriverData) : ConnectionResult {
        if ( dataSources.containsKey(connection.name)) disconnect(connection)
        val dataSource = HikariDataSource().apply {
            //dataSourceClassName = "org.postgresql.ds.PGSimpleDataSource"
            driverClassName = driver.driverClass
            jdbcUrl = connection.url
            username = connection.username
            password = connection.password
            poolName = connection.name
            idleTimeout = 30000
            maxLifetime = 60000
            maximumPoolSize = connection.maxPoolSize
            minimumIdle = 1
            addDataSourceProperty("applicationName", "jdbcode")
        }
        configs.put(connection.name, connection)
        dataSources.put(connection.name, dataSource)
        val result = ConnectionResult()
        result.schemas.addAll(schemaDesriber.getSchemas(connection, dataSource))
        result.keywords.addAll(schemaDesriber.getKeywords(dataSource))
        return result
    }

    /**
     * Refresh the schema info for the given connection
     */
    fun refresh(connection: ConnectionData) : ConnectionResult {
        val dataSource = dataSources[connection.name]
        if ( dataSource == null) throw IllegalStateException("No data source found for ${connection.name}")
        val result = ConnectionResult()
        result.schemas.addAll(schemaDesriber.getSchemas(connection, dataSource))
        result.keywords.addAll(schemaDesriber.getKeywords(dataSource))
        return result
    }

    open fun disconnect(connection: ConnectionData) {
        closeStatements(connection)
        val dataSource = dataSources.remove(connection.name)
        dataSource?.close()
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

    open fun reexecute(id: String) : SqlStatement {
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