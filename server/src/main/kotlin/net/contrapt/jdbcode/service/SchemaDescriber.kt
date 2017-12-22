package net.contrapt.jdbcode.service

import net.contrapt.jdbcode.model.ProcedureData
import net.contrapt.jdbcode.model.SchemaData
import net.contrapt.jdbcode.model.TableData
import javax.sql.DataSource

class SchemaDescriber {

    fun getSchemas(dataSource: DataSource) : Collection<SchemaData> {
        val results = mutableListOf<SchemaData>()
        val connection = dataSource.connection
        connection.autoCommit = true
        try {
            val catalogRows = connection.metaData.catalogs
            while (catalogRows.next()) {
                results.add(SchemaData(catalogRows.getString(1), "catalog"))
            }
            val schemaRows = connection.metaData.schemas
            while (schemaRows.next()) {
                results.add(SchemaData(schemaRows.getString(1), "schema"))
            }
        }
        finally {
            connection.close()
        }
        return results
    }

    fun getObjects(dataSource: DataSource, schemaData: SchemaData) : SchemaData {
        val connection = dataSource.connection
        connection.autoCommit = true
        val catalog = if ( schemaData.type == "catalog" ) schemaData.name else null
        val schema = if ( schemaData.type == "schema" ) schemaData.name else null
        try {
            // Tables
            val tables = connection.metaData.getTables(catalog, schema, null, null)
            while (tables.next()) {
                val catalogName: String? = tables.getString("TABLE_CAT")
                val schemaName: String? = tables.getString("TABLE_SCHEM")
                val owner = (if (catalogName == null) schemaName else catalogName) ?: "?"
                val name: String = tables.getString("TABLE_NAME") ?: ""
                val type: String = tables.getString("TABLE_TYPE") ?: ""
                schemaData.object_types.add(type)
                schemaData.objects.getOrPut(type, { mutableSetOf() }).add(TableData(owner, name, type))
            }
            // Procedures
            val procedures = connection.metaData.getProcedures(catalog, schema, null)
            while (procedures.next()) {
                val catalogName: String? = procedures.getString("PROCEDURE_CAT")
                val schemaName: String? = procedures.getString("PROCEDURE_SCHEM")
                val owner = (if (catalogName == null) schemaName else catalogName) ?: "?"
                val name: String = procedures.getString("PROCEDURE_NAME")
                val type: Int = procedures.getInt("PROCEDURE_TYPE")
                schemaData.object_types.add("PROCEDURE")
                schemaData.objects.getOrPut("PROCEDURE", { mutableSetOf() }).add(ProcedureData(owner, name, type))
            }
        }
        finally {
            connection.close()
        }
        schemaData.resolved = true
        return schemaData
    }

}