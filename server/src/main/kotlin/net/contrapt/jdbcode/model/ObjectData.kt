package net.contrapt.jdbcode.model

open class ObjectData(
        open val owner: ObjectOwner = ObjectOwner(null, null),
        open val name: String = "",
        open val type: ObjectType = ObjectType.table
)

