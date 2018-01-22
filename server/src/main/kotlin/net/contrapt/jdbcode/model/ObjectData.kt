package net.contrapt.jdbcode.model

open class ObjectData(
        open val owner: String = "",
        open val name: String = "",
        open val type: ObjectType = ObjectType.table
)

