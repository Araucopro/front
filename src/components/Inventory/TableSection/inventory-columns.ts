export const inventoryColumns = [
    { id: "product", label: "Producto" },
    { id: "sku", label: "SKU" },
    { id: "supplierSku", label: "SKU proveedor" },
    { id: "ean", label: "Código EAN" },
    { id: "brand", label: "Marca" },
    { id: "category", label: "Categoría" },
    { id: "netCost", label: "Costo neto", adminOnly: true },
    { id: "price", label: "Precio plaza" },
    { id: "variant", label: "Variante" },
    { id: "subvariant", label: "Subvariante" },
    { id: "stock", label: "Stock" },
    { id: "aggregateStock", label: "Stock agregado" },
] as const

export type InventoryColumnId = (typeof inventoryColumns)[number]["id"]

export const defaultInventoryColumns: InventoryColumnId[] = inventoryColumns.map((column) => column.id)
