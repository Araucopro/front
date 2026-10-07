import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { getInventoryColumnPreference, replaceInventoryColumnPreference } from "@/actions/users/inventoryColumnPreferences"
import {
    inventoryColumnStoreFilters,
    type IInventoryColumnPreferenceQuery,
} from "@/interfaces/users/IInventoryColumnPreference"
import { normalizeHiddenInventoryColumns } from "@/utils/inventory-column-preferences"
import {
    defaultInventoryColumns,
    type InventoryColumnId,
} from "@/components/Inventory/TableSection/inventory-columns"

const validColumns = new Set<InventoryColumnId>(defaultInventoryColumns)

type ColumnSelection = { key: string | null; hidden: InventoryColumnId[]; error: string | null }

export function useInventoryColumns(userID?: string, storeID?: string) {
    const key = userID && storeID ? `${userID}:${storeID}` : null
    const query = useMemo<IInventoryColumnPreferenceQuery | null>(() => {
        if (!storeID) return null
        const storeFilter = inventoryColumnStoreFilters.find((filter) => filter === storeID)
        return storeFilter ? { storeFilter } : { storeID }
    }, [storeID])
    const [selection, setSelection] = useState<ColumnSelection>({ key: null, hidden: [], error: null })
    const [saving, setSaving] = useState(false)
    const [loadRevision, setLoadRevision] = useState(0)
    const activeKey = useRef<string | null>(null)
    const saveInFlight = useRef(false)

    useEffect(() => {
        activeKey.current = key
        if (!key || !query) return
        const controller = new AbortController()
        setSelection({ key: null, hidden: [], error: null })
        void getInventoryColumnPreference(query, controller.signal)
            .then((preference) => {
                if (controller.signal.aborted) return
                setSelection({ key, hidden: normalizeHiddenInventoryColumns(preference.hiddenColumns), error: null })
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return
                setSelection({
                    key,
                    hidden: [],
                    error: error instanceof Error ? error.message : "No se pudieron cargar tus preferencias de columnas.",
                })
            })
        return () => {
            controller.abort()
            activeKey.current = null
        }
    }, [key, query, loadRevision])

    const hiddenColumns = selection.key === key ? selection.hidden : []
    const visibleColumns = defaultInventoryColumns.filter((column) => !hiddenColumns.includes(column))
    const ready = Boolean(key && selection.key === key && !selection.error)

    const persistColumns = async (hidden: InventoryColumnId[]) => {
        if (!key || !query || !ready || saveInFlight.current) return
        saveInFlight.current = true
        setSaving(true)
        const previousHidden = hiddenColumns
        setSelection({ key, hidden, error: null })
        try {
            const preference = await replaceInventoryColumnPreference(query, { hiddenColumns: hidden })
            if (activeKey.current === key) {
                setSelection({ key, hidden: normalizeHiddenInventoryColumns(preference.hiddenColumns), error: null })
            }
        } catch (error: unknown) {
            if (activeKey.current === key) {
                setSelection({ key, hidden: previousHidden, error: null })
                toast.error("No se pudieron guardar tus columnas", {
                    description: error instanceof Error ? error.message : "Vuelve a intentarlo.",
                })
            }
        } finally {
            saveInFlight.current = false
            setSaving(false)
        }
    }

    const toggleColumn = (column: InventoryColumnId) => {
        if (!key || !validColumns.has(column)) return
        if (visibleColumns.length === 1 && visibleColumns.includes(column)) return
        const hidden = hiddenColumns.includes(column)
            ? hiddenColumns.filter((item) => item !== column)
            : [...hiddenColumns, column]
        void persistColumns(hidden)
    }

    const resetColumns = () => {
        void persistColumns([])
    }

    return {
        visibleColumns,
        toggleColumn,
        resetColumns,
        ready,
        saving,
        loadError: selection.key === key ? selection.error : null,
        retryColumns: () => setLoadRevision((revision) => revision + 1),
    }
}
