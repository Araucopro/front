export interface InventoryRow {
    "Descripcion del producto": string
    Producto: string
    Imagen: string
    Género: string
    Marca: string
    Categoría: string
    Subcategoría: string
    Variante: string | number | null
    Subvariante: string
    Cantidad: number
    "Precio Costo Neto": number
    "Precio Plaza": number
    "SKU Proveedor": string
    "SKU Tienda": string
    "Código EAN": string
    Slug: string
}
