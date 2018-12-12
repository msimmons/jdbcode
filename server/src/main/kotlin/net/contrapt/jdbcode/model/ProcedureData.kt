package net.contrapt.jdbcode.model

data class ProcedureData (
        override val owner: ObjectOwner = ObjectOwner(null, null),
        override val name: String = "",
        override val type: ObjectType = ObjectType.procedure,
        val returnsValue: String = "",
        val params: MutableSet<ParameterData> = mutableSetOf()
) : ObjectData()