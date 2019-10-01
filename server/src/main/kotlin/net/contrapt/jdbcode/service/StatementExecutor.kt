package net.contrapt.jdbcode.service

import io.vertx.core.logging.LoggerFactory
import net.contrapt.jdbcode.model.*
import java.io.InputStream
import java.io.Reader
import java.math.BigDecimal
import java.net.URL
import java.sql.*
import java.sql.Date
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.min
import kotlin.system.measureTimeMillis

class StatementExecutor(val config: ConnectionData, val connection: Connection, val sqlStatement: SqlStatement) {

    private val logger = LoggerFactory.getLogger(javaClass)

    private val statement: PreparedStatement

    private var results: ResultSet? = null
    private var columns: MutableList<String> = mutableListOf()
    private var rows: MutableList<MutableList<Any?>> = mutableListOf()
    private var updateCount = -1;
    private var executionCount = 0
    private var executionTime = 0L
    private var status = StatementStatus.executing
    private var type = StatementType.query

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
        updateCount = -1
        results?.close()
        executionCount++
        executionTime += measureTimeMillis {
            statement.execute()
        }
        status = StatementStatus.executed
        updateCount = statement.updateCount
        type = when (updateCount) {
            -1 -> StatementType.query
            else -> StatementType.crud
        }
        results = statement.resultSet
    }

    /**
     * Fetch rows from the current result set, limited by [fetchLimit] if the connection is
     * set to [isLimited] true
     */
    fun fetch() : SqlResult {
        if (results == null) {
            return SqlResult(sqlStatement.id, status, type, updateCount, false, executionCount, executionTime, 0)
        }
        // Get the column names
        val columnCount = results?.metaData?.columnCount ?: 0
        columns.clear()
        (1..columnCount).forEach {
            columns.add(results?.metaData?.getColumnName(it) ?: "")
        }
        var moreRows = false
        // Fetch rows
        val fetchTime = measureTimeMillis {
            rows.clear()
            while ( results?.next() ?: false ) {
                val row = mutableListOf<Any?>()
                (1..columnCount).forEach {
                    row.add(convertValue(results, it))
                }
                rows.add(row)
                if (isLimited && rows.size == fetchLimit) {
                    moreRows = true
                    break
                }
            }
        }
        // Commit for selects with no more rows (or 0 row dml)
        if (updateCount <= 0 && !moreRows) connection.commit()
        return SqlResult(sqlStatement.id, status, type, updateCount, moreRows, executionCount, executionTime, fetchTime, columns, rows)
    }

    /**
     * Cancel the current statement if possible
     */
    fun cancel() : SqlResult {
        if ( !statement.isClosed) statement.cancel()
        if ( !connection.isClosed) connection.rollback()
        try {
            results?.close()
        } catch (e: SQLException) {
            logger.warn("$javaClass.cancel(): $e")
        }
        results = null
        status = StatementStatus.cancelled
        updateCount = -1
        return SqlResult(sqlStatement.id, status, type, updateCount, false, executionCount, executionTime, 0, columns, rows)
    }

    /**
     * Commit the current connection
     */
    fun commit() : SqlResult {
        if ( !connection.isClosed) {
            updateCount = -1
            status = StatementStatus.committed
            connection.commit()
        }
        return SqlResult(sqlStatement.id, status, type, updateCount, false, executionCount, executionTime, 0, columns, rows)
    }

    /**
     * Rollback the current connection
     */
    fun rollback() : SqlResult {
        if ( !connection.isClosed) {
            updateCount=-1
            status = StatementStatus.rolledback
            connection.rollback()
        }
        return SqlResult(sqlStatement.id, status, type, updateCount, false, executionCount, executionTime, 0, columns, rows)
    }

    /**
     * Close resources used by this model
     */
    fun close() : SqlResult {
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
        return SqlResult(sqlStatement.id)
    }

    /**
     * Convert column value to one appropriate for serializing as JSON to client; that is basically native types
     * and String values
     *
     * Currently limiting blob, clob to 4000 bytes/chars
     */
    private fun convertValue(row: ResultSet?, column: Int): Any? {
        if ( row == null ) return ""
        val value = row.getObject(column)
        val type = row.metaData.getColumnType(column)
        val typeName = row.metaData.getColumnTypeName(column)
        try {
            return when ( value ) {
                null -> ""
                is Array<*> -> value.joinToString(",", "[", "]") { it.toString() }
                is InputStream -> "inputStream"
                is BigDecimal -> value.toDouble()
                is Blob -> Base64.getEncoder().encodeToString(value.getBytes(1, min(value.length().toInt(), 4000)))
                is Clob -> value.getSubString(1, min(value.length().toInt(), 4000))
                is NClob -> value.getSubString(1, min(value.length().toInt(), 4000))
                is ByteArray -> Base64.getEncoder().encodeToString(value)
                is Reader -> value.readText()
                is Date -> formatDateTime(value)
                is Time -> formatDateTime(value)
                is Timestamp -> formatDateTime(value)
                is SQLXML -> value.string
                is URL -> value.toExternalForm()
                is String, is Int, is Long, is Float, is Double, is Boolean -> value
                else -> altConvert(row, column, type, value)
            }
        }
        catch (e: Exception) {
            logger.warn("Exception converting $value (${value::class}) type=($type, $typeName)", e)
            return value?.toString() ?: ""
        }
    }

    private fun altConvert(row: ResultSet, column: Int, type: Int, value: Any) : Any? {
        return when(type) {
            Types.REF -> row.getRef(column).baseTypeName
            Types.REF_CURSOR -> row.getRef(column)
            Types.ROWID -> row.getRowId(column)
            Types.SQLXML -> row.getString(column)
            Types.TIME -> formatDateTime(row.getTime(column))
            Types.TIMESTAMP -> formatDateTime(row.getTimestamp(column))
            Types.TIMESTAMP_WITH_TIMEZONE -> formatDateTime(row.getTimestamp(column))
            Types.TIME_WITH_TIMEZONE -> formatDateTime(row.getTimestamp(column))
            else -> value.toString()
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