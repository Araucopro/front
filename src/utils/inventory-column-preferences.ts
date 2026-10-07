import {
    defaultInventoryColumns,
    type InventoryColumnId,
} from "@/components/Inventory/TableSection/inventory-columns"

export function normalizeHiddenInventoryColumns(columns: readonly string[]): InventoryColumnId[] {
    const hidden = defaultInventoryColumns.filter((column) => columns.includes(column))
    return hidden.length === defaultInventoryColumns.length
        ? hidden.filter((column) => column !== "product")
        : hidden
}
