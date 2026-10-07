"use client"

import { Columns3, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { inventoryColumns, type InventoryColumnId } from "@/components/Inventory/TableSection/inventory-columns"

type InventoryColumnManagerProps = {
    visibleColumns: InventoryColumnId[]
    onToggle: (column: InventoryColumnId) => void
    onReset: () => void
    isAdmin: boolean
    disabled: boolean
    saving: boolean
    loadError: string | null
    onRetry: () => void
}

export default function InventoryColumnManager({
    visibleColumns,
    onToggle,
    onReset,
    isAdmin,
    disabled,
    saving,
    loadError,
    onRetry,
}: InventoryColumnManagerProps) {
    const availableColumns = inventoryColumns.filter((column) => !("adminOnly" in column) || isAdmin)
    const visibleCount = availableColumns.filter((column) => visibleColumns.includes(column.id)).length

    if (loadError) {
        return (
            <div className="flex flex-wrap items-center gap-2" role="alert">
                <p className="text-xs text-red-600 dark:text-red-400" title={loadError}>
                    No se pudieron cargar tus columnas.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                    Reintentar
                </Button>
            </div>
        )
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" disabled={disabled} className="h-11 gap-2 whitespace-nowrap">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Columns3 className="h-4 w-4" />}
                    {saving ? "Guardando columnas..." : "Administrar columnas"}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Columnas visibles</p>
                    <span className="text-xs text-slate-500">{visibleCount}/{availableColumns.length}</span>
                </div>
                <div className="max-h-72 space-y-1 overflow-y-auto">
                    {availableColumns.map((column) => {
                        const checked = visibleColumns.includes(column.id)
                        return (
                            <label
                                key={column.id}
                                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <Checkbox
                                    checked={checked}
                                    disabled={disabled || (checked && visibleCount === 1)}
                                    onCheckedChange={() => onToggle(column.id)}
                                    aria-label={column.label}
                                />
                                <span>{column.id === "stock" ? (isAdmin ? "Stock central" : "Stock tienda") : column.label}</span>
                            </label>
                        )
                    })}
                </div>
                <Button type="button" variant="ghost" size="sm" className="mt-2 w-full" onClick={onReset} disabled={disabled}>
                    Mostrar todas
                </Button>
            </PopoverContent>
        </Popover>
    )
}
