import { useEffect, useState } from "react"
import {
    defaultInventoryColumns,
    type InventoryColumnId,
} from "@/components/Inventory/TableSection/inventory-columns"

const storagePrefix = "inventory-columns:v1"
const validColumns = new Set<InventoryColumnId>(defaultInventoryColumns)

type ColumnSelection = { key: string | null; hidden: InventoryColumnId[] }

export function useInventoryColumns(userID?: string, storeID?: string) {
    const key = userID && storeID ? `${storagePrefix}:${userID}:${storeID}` : null
    const [selection, setSelection] = useState<ColumnSelection>({ key: null, hidden: [] })

    useEffect(() => {
        if (!key) return
        try {
            const saved = JSON.parse(localStorage.getItem(key) ?? "null")
            const hidden = Array.isArray(saved)
                ? defaultInventoryColumns.filter((column) => saved.includes(column))
                : []
            setSelection({ key, hidden })
        } catch {
            setSelection({ key, hidden: [] })
        }
    }, [key])

    const hiddenColumns = selection.key === key ? selection.hidden : []
    const visibleColumns = defaultInventoryColumns.filter((column) => !hiddenColumns.includes(column))

    const toggleColumn = (column: InventoryColumnId) => {
        if (!key || !validColumns.has(column)) return
        if (visibleColumns.length === 1 && visibleColumns.includes(column)) return
        const hidden = hiddenColumns.includes(column)
            ? hiddenColumns.filter((item) => item !== column)
            : [...hiddenColumns, column]
        setSelection({ key, hidden })
        if (hidden.length) localStorage.setItem(key, JSON.stringify(hidden))
        else localStorage.removeItem(key)
    }

    const resetColumns = () => {
        if (!key) return
        setSelection({ key, hidden: [] })
        localStorage.removeItem(key)
    }

    return { visibleColumns, toggleColumn, resetColumns, ready: Boolean(key && selection.key === key) }
}
