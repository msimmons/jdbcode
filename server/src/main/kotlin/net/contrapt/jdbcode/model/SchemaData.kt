package net.contrapt.jdbcode.model

data class SchemaData(
        val name: String = "",
        val type: SchemaType = SchemaType.schema,
        var resolved: Boolean = false,
        val object_types: MutableSet<TypeData> = mutableSetOf(),
        var error: String? = null
) {

    fun addObject(obj: ObjectData) {
        object_types.find { it.name == obj.type }?.objects?.add(obj) ?: object_types.add(TypeData(obj.type).apply { objects.add(obj) })
    }
}
