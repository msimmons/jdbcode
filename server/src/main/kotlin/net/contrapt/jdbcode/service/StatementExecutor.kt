package net.contrapt.jdbcode.service

import io.vertx.core.logging.LoggerFactory
import net.contrapt.jdbcode.model.ConnectionData
import net.contrapt.jdbcode.model.SqlStatement
import net.contrapt.jdbcode.model.StatementStatus
import net.contrapt.jdbcode.model.StatementType
import java.io.InputStream
import java.io.Reader
import java.math.BigDecimal
import java.net.URL
import java.sql.*
import java.sql.Date
import java.text.SimpleDateFormat
import java.util.*
import kotlin.system.measureTimeMillis

class StatementExecutor(val config: ConnectionData, val connection: Connection, val sqlStatement: SqlStatement) {

    private val logger = LoggerFactory.getLogger(javaClass)

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
        statement.fetchSize = fetchLimit
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
        sqlStatement.status = StatementStatus.executed
        sqlStatement.updateCount = statement.updateCount
        sqlStatement.type = when (sqlStatement.updateCount) {
            -1 -> StatementType.query
            else -> StatementType.crud
        }
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
        columns.clear()
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
                    row.add(convertValue(results, it))
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
            logger.warn("$javaClass.cancel(): $e")
        }
        results = null
        sqlStatement.status = StatementStatus.cancelled
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
        sqlStatement.status = StatementStatus.committed
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
        sqlStatement.status = StatementStatus.rolledback
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
            logger.warn("Closing statement: $e")
        }
        try {
            if ( !connection.isClosed) connection.close()
        } catch (e: SQLException) {
            logger.warn("Closing connection: $e")
        }
        return sqlStatement
    }

    /**
     * Convert column value to one appropriate for serializing as JSON to client; that is basically native types
     * and String values
     *
     * Should we limit size of blobish things?
     */
    private fun convertValue(row: ResultSet?, column: Int): Any? {
        if ( row == null ) return ""
        val value = row.getObject(column)
        try {
            return when ( value ) {
                null -> ""
                is Array<*> -> value.joinToString(",", "[", "]") { it.toString() }
                is InputStream -> "inputStream"
                is BigDecimal -> value.toDouble()
                is Blob -> Base64.getEncoder().encodeToString(value.getBytes(0, value.length().toInt()))
                is Clob -> value.getSubString(0, value.length().toInt())
                is NClob -> value.getSubString(0, value.length().toInt())
                is ByteArray -> Base64.getEncoder().encodeToString(value)
                is Reader -> value.readText()
                is Date -> formatDateTime(value)
                is Time -> formatDateTime(value)
                is Timestamp -> formatDateTime(value)
                is SQLXML -> value.string
                is URL -> value.toExternalForm()
                is String, is Int, is Long, is Float, is Double, is Boolean -> value
                else -> value.toString()
            }
        }
        catch (e: Exception) {
            logger.warn("Exception converting $value (${value::class})", e)
            return value?.toString() ?: ""
        }
    }

    companion object {

        private val DEFAULT_DATE_FORMAT = "yyyy-MM-dd"
        private val DEFAULT_DATETIME_FORMAT = "yyyy-MM-dd HH:mm:ss.SSSZ"
        private val DEFAULT_TIME_FORMAT = "HH:mm:ss.SSSZ"

        private var dateFormat = SimpleDateFormat(DEFAULT_DATE_FORMAT)
        private var timeFormat = SimpleDateFormat(DEFAULT_TIME_FORMAT)
        private var dateTimeFormat = SimpleDateFormat(DEFAULT_DATETIME_FORMAT)

        fun setDateFormat(format: String) {
            dateFormat = SimpleDateFormat(format)
        }

        fun formatDateTime(value: Date) : String = dateFormat.format(value)
        fun formatDateTime(value: Time) : String = timeFormat.format(value)
        fun formatDateTime(value: Timestamp) : String = dateTimeFormat.format(value)
    }
}