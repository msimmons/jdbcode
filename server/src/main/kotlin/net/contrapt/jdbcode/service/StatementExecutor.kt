package net.contrapt.jdbcode.service

import net.contrapt.jdbcode.model.ConnectionData
import net.contrapt.jdbcode.model.SqlStatement
import java.lang.Exception
import java.sql.*
import java.text.SimpleDateFormat
import java.util.logging.Logger
import kotlin.system.measureTimeMillis

class StatementExecutor(val config: ConnectionData, val connection: Connection, val sqlStatement: SqlStatement) {

    private val logger : Logger = Logger.getLogger(javaClass.name)

    private val statement: PreparedStatement

    private var results: ResultSet? = null
    private var columns: MutableList<String> = mutableListOf()
    private var rows: MutableList<MutableList<Any?>> = mutableListOf()

    private var isLimited = true
    private var autocommit = config.autoCommit

    private var fetchLimit = config.fetchLimit

    init {
        connection.autoCommit = autocommit
        statement = connection.prepareStatement(sqlStatement.sql)
    }

    fun execute() {
        rows.clear()
        sqlStatement.error = null
        sqlStatement.updateCount = -1
        results?.close()
        sqlStatement.executionCount++
        sqlStatement.executionTime += measureTimeMillis {
            statement.execute()
        }
        sqlStatement.updateCount = statement.updateCount
        results = statement.resultSet
        // Commit for selects to release any locks
        if ( sqlStatement.updateCount <= 0 ) connection.commit()
    }

    /**
     * Fetch rows from the current result set, limited by [fetchLimit] if the connection is
     * set to [isLimited] true
     */
    fun fetch() : SqlStatement {
        if (results == null) return sqlStatement
        // Get the column names
        val columnCount = results?.metaData?.columnCount ?: 0
        (1..columnCount).forEach {
            columns.add(results?.metaData?.getColumnName(it) ?: "")
        }
        sqlStatement.columns = columns
        sqlStatement.rows = rows
        // Fetch rows
        sqlStatement.fetchTime = measureTimeMillis {
            while ( results?.next() ?: false ) {
                val row = mutableListOf<Any?>()
                (1..columnCount).forEach {
                    row.add(convertToDisplay(results, it))
                }
                rows.add(row)
                if (isLimited && rows.size == fetchLimit) {
                    sqlStatement.moreRows = true
                    return sqlStatement
                }
            }
        }
        return sqlStatement
    }

    /**
     * Cancel the current statement if possible
     */
    fun cancel() : SqlStatement {
        if ( !statement.isClosed) statement.cancel()
        if ( !connection.isClosed) connection.rollback()
        try {
            results?.close()
        } catch (e: SQLException) {
            logger.warning("$javaClass.cancel(): $e")
        }
        results = null
        return sqlStatement
    }

    /**
     * Commit the current connection
     */
    fun commit() : SqlStatement {
        if ( !connection.isClosed) {
            sqlStatement.updateCount=-1
            connection.commit()
        }
        return sqlStatement
    }

    /**
     * Rollback the current connection
     */
    fun rollback() : SqlStatement {
        if ( !connection.isClosed) {
            sqlStatement.updateCount=-1
            connection.rollback()
        }
        return sqlStatement
    }

    /**
     * Close resources used by this model
     */
    fun close() : SqlStatement {
        cancel()
        try {
            if ( !statement.isClosed) statement.close()
        } catch (e: SQLException) {
            logger.warning("Closing statement: $e")
        }
        try {
            if ( !connection.isClosed) connection.close()
        } catch (e: SQLException) {
            logger.warning("Closing connection: $e")
        }
        return sqlStatement
    }

    /**
     * Convert certain objects (esp date/timestamp) returned from sql to appropriate
     * displayable objects
     */
    private fun convertToDisplay(row: ResultSet?, column: Int): Any? {
        if (row == null) return ""
        try {
            when (row.metaData.getColumnType(column)) {
                Types.DATE, Types.TIMESTAMP, Types.TIME -> {
                    val value = row.getTimestamp(column)
                    return if (value == null) "" else dateFormat.format(value)
                }
                Types.BINARY, Types.VARBINARY, Types.LONGVARBINARY, Types.BLOB, Types.CLOB, Types.OTHER -> return row.getString(column)
                else -> return row.getObject(column) ?: null
            }
        } catch (e: Exception) {
            return e.toString()
        }
    }

    companion object {

        private val DEFAULT_DATE_FORMAT = "yyyy-MM-dd HH:mm:ss"
        private var dateFormat = SimpleDateFormat(DEFAULT_DATE_FORMAT)

        fun setDateFormat(format: String) {
            dateFormat = SimpleDateFormat(format)
        }
    }
}