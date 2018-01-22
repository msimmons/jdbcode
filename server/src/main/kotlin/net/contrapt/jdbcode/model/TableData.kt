package net.contrapt.jdbcode.model

data class TableData (
        override val owner: String = "",
        override val name: String = "",
        override val type: ObjectType = ObjectType.table,
        val columns: MutableSet<ColumnData> = mutableSetOf()
) : ObjectData() {

    constructor(objectData: ObjectData) : this(objectData.owner, objectData.name, objectData.type)

    fun addPrimaryKey(name: String, sequence: Int) {
        columns.firstOrNull { it.name == name }?.keySequence = sequence
    }

    fun addForeignKey(owner: String, name: String, pkcolumn: String, fkcolumn: String) {
        columns.firstOrNull { it.name == fkcolumn }?.references = "${owner}.${name}.${pkcolumn}"
    }
}