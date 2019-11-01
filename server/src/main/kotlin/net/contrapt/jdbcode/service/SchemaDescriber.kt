package net.contrapt.jdbcode.service

import io.vertx.core.logging.LoggerFactory
import net.contrapt.jdbcode.model.*
import java.sql.Connection
import javax.sql.DataSource

class SchemaDescriber {

    private val logger = LoggerFactory.getLogger(javaClass)

    fun getSchemas(connectionData: ConnectionData, dataSource: DataSource) : Collection<SchemaData> {
        val results = mutableListOf<SchemaData>()
        val connection = dataSource.connection
        connection.autoCommit = true
        try {
            val catalogRows = connection.metaData.catalogs
            while (catalogRows.next()) {
                var catalog = SchemaData(catalogRows.getString(1), SchemaType.catalog)
                if ( shouldInclude("${catalog.type}:${catalog.name}", connectionData) ) {
                    catalog = getObjects(dataSource, catalog)
                    results.add(catalog)
                }
            }
            val schemaRows = connection.metaData.schemas
            while (schemaRows.next()) {
                var schema = SchemaData(schemaRows.getString(1), SchemaType.schema)
                if ( shouldInclude("${schema.type}:${schema.name}", connectionData) ) {
                    schema = getObjects(dataSource, schema)
                    results.add(schema)
                }
            }
        }
        finally {
            connection.close()
        }
        return results
    }

    private fun shouldInclude(name: String, connectionData: ConnectionData) : Boolean {
        return (connectionData.includes.any { it.toLowerCase() == name.toLowerCase() } || connectionData.includes.size == 0)
        && !connectionData.excludes.any { it.toLowerCase() == name.toLowerCase() }
    }

    fun getKeywords(dataSource: DataSource) : Collection<String> {
        // Additional Keywords
        val connection = dataSource.connection
        return connection.metaData.sqlKeywords.split(",").toList()
    }

    fun getObjects(dataSource: DataSource, schemaData: SchemaData) : SchemaData {
        val connection = dataSource.connection
        connection.autoCommit = true
        val catalog = if ( schemaData.type == SchemaType.catalog ) schemaData.name else null
        val schema = if ( schemaData.type == SchemaType.schema ) schemaData.name else null
        try {
            // Tables
            val tables = connection.metaData.getTables(catalog, schema, null, null)
            while (tables.next()) {
                val catalogName: String? = tables.getString("TABLE_CAT")
                val schemaName: String? = tables.getString("TABLE_SCHEM")
                val name: String = tables.getString("TABLE_NAME") ?: ""
                val typeString: String = tables.getString("TABLE_TYPE") ?: ""
                val type = typeStringToType(typeString)
                schemaData.addObject(TableData(ObjectOwner(schemaName, catalogName), name, type))
            }
            // Procedures
            val procedures = connection.metaData.getProcedures(catalog, schema, null)
            val returnTypes = listOf("unknown", "no", "yes")
            while (procedures.next()) {
                val catalogName: String? = procedures.getString("PROCEDURE_CAT")
                val schemaName: String? = procedures.getString("PROCEDURE_SCHEM")
                val name: String = procedures.getString("PROCEDURE_NAME")
                val returnsValue: String = returnTypes[procedures.getInt("PROCEDURE_TYPE")]
                schemaData.addObject(ProcedureData(ObjectOwner(schemaName, catalogName), name, ObjectType.procedure, returnsValue))
            }
            schemaData.resolved = true
            return schemaData
        }
        catch(e: Exception) {
            schemaData.error = e.message
            return schemaData
        }
        finally {
            connection.close()
        }
    }

    fun describeObject(dataSource: DataSource, objectData: ObjectData) : ObjectData {
        val connection = dataSource.connection
        connection.autoCommit = true
        try {
            return when (objectData.type) {
                ObjectType.table -> describeTable(connection, objectData)
                ObjectType.view -> describeTable(connection, objectData)
                ObjectType.sequence -> describeTable(connection, objectData)
                ObjectType.index -> describeTable(connection, objectData)
                ObjectType.procedure -> describeProcedure(connection, objectData)
                else -> objectData
            }
        }
        finally {
            connection.close()
        }
    }

    private fun describeTable(connection: Connection, objectData: ObjectData) : TableData {
        val tableData = TableData(objectData.owner, objectData.name, objectData.type)
        val columns = connection.metaData.getColumns(objectData.owner.catalog, objectData.owner.schema, objectData.name, null)
        while ( columns.next() ) {
            val name = columns.getString("COLUMN_NAME")
            val type = columns.getString("TYPE_NAME")
            val dataType = columns.getInt("DATA_TYPE")
            val size = columns.getInt("COLUMN_SIZE")
            val default = columns.getString("COLUMN_DEF")
            val position = columns.getInt("ORDINAL_POSITION")
            val nullable = columns.getString("IS_NULLABLE")
            val autoincrement = columns.getString("IS_AUTOINCREMENT")
            tableData.columns.add(ColumnData(name, type, dataType, size, default, position, nullable, autoincrement))
        }
        val pkeys = connection.metaData.getPrimaryKeys(null, null, objectData.name)
        while ( pkeys.next() ) {
            val name = pkeys.getString("COLUMN_NAME")
            val seq = pkeys.getInt("KEY_SEQ")
            tableData.addPrimaryKey(name, seq)
        }
        val fkeys = connection.metaData.getImportedKeys(null, null, objectData.name)
        while ( fkeys.next() ) {
            val owner = fkeys.getString("PKTABLE_SCHEM")
            val name = fkeys.getString("PKTABLE_NAME")
            val pkcolumn = fkeys.getString("PKCOLUMN_NAME")
            val fkcolumn = fkeys.getString("FKCOLUMN_NAME")
            tableData.addForeignKey(owner, name, pkcolumn, fkcolumn)
        }
        try {
            val indices = connection.metaData.getIndexInfo(objectData.owner.catalog, objectData.owner.schema, objectData.name, false, true)
            while (indices.next()) {
                val name = indices.getString("INDEX_NAME") ?: "?"
                val unique = !indices.getBoolean("NON_UNIQUE")
                val position = indices.getInt("ORDINAL_POSITION")
                val column = indices.getString("COLUMN_NAME") ?: "?"
                val direction = indices.getString("ASC_OR_DESC") ?: "?"
                val filter = indices.getString("FILTER_CONDITION")
                tableData.addIndex(column, IndexData(name, unique, position, direction, filter))
            }
        }
        catch (e : Exception) {
            logger.warn("Error retrieving index info", e)
        }
        return tableData
    }

    private fun describeProcedure(connection: Connection, objectData: ObjectData) : ProcedureData {
        val procedureData = ProcedureData(objectData.owner, objectData.name, objectData.type)
        val inOuts = listOf("unknown", "in", "in/out", "result", "out", "return")
        val params = connection.metaData.getProcedureColumns(objectData.owner.catalog, objectData.owner.schema, objectData.name, null)
        while ( params.next() ) {
            val name = params.getString("COLUMN_NAME")
            val inOut = inOuts[params.getInt("COLUMN_TYPE")]
            val dataType = params.getInt("DATA_TYPE")
            val type = params.getString("TYPE_NAME")
            val default = params.getString("COLUMN_DEF")
            val position = params.getInt("ORDINAL_POSITION")
            val nullable = params.getString("IS_NULLABLE")
            procedureData.params.add(ParameterData(name, type, dataType, inOut, default, position, nullable))
        }
        return procedureData
    }

    /**
     * Sometimes tables indices and views have funny names like SYSTEM TABLE, so this takes care of that
     */
    private fun typeStringToType(typeString: String) : ObjectType {
        if ( typeString.toLowerCase().contains("table")) return ObjectType.table
        if ( typeString.toLowerCase().contains("index")) return ObjectType.index
        if ( typeString.toLowerCase().contains("view")) return ObjectType.view
        if ( typeString.toLowerCase().contains("sequence")) return ObjectType.sequence
        return ObjectType.unknown
    }

}