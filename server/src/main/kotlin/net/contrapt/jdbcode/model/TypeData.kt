package net.contrapt.jdbcode.model

data class TypeData(
        val name: ObjectType = ObjectType.table,
        val type: String = "object_type",
        val objects: MutableSet<ObjectData> = mutableSetOf()
)
