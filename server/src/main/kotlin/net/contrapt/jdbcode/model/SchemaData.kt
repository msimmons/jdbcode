package net.contrapt.jdbcode.model

data class SchemaData(
        val name: String = "",
        val type: SchemaType = SchemaType.schema,
        var resolved: Boolean = false,
        val objectTypes: MutableSet<TypeData> = mutableSetOf(),
        var error: String? = null
) {

    fun addObject(obj: ObjectData) {
        objectTypes.find { it.name == obj.type }?.objects?.add(obj) ?: objectTypes.add(TypeData(obj.type).apply { objects.add(obj) })
    }
}
