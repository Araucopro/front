"use client"
import InventoryActions from "@/components/Inventory/HeaderSetion/InventoryActions"
import InventoryStats from "@/components/Inventory/HeaderSetion/InventoryStats"
import type { ICategory } from "@/interfaces/categories/ICategory"
import { inventoryStore } from "@/stores/inventory.store"
import { useAuth } from "@/stores/user.store"
import { Role } from "@/lib/userRoles"
import type { InventoryColumnId } from "@/components/Inventory/TableSection/inventory-columns"
import InventoryColumnManager from "./InventoryColumnManager"

interface InventoryHeaderProps {
    totalStockCentral: number
    filteredStockTotal: number
    uniqueProductsInCurrentPage: number
    searchedProductsLength: number
    categories: ICategory[]
    visibleColumns: InventoryColumnId[]
    onToggleColumn: (column: InventoryColumnId) => void
    onResetColumns: () => void
    columnsReady: boolean
    columnsSaving: boolean
    columnsLoadError: string | null
    onRetryColumns: () => void
}

export default function InventoryHeader({
    totalStockCentral,
    filteredStockTotal,
    uniqueProductsInCurrentPage,
    searchedProductsLength,
    categories,
    visibleColumns,
    onToggleColumn,
    onResetColumns,
    columnsReady,
    columnsSaving,
    columnsLoadError,
    onRetryColumns,
}: InventoryHeaderProps) {
    const { rawProducts } = inventoryStore()
    const { user } = useAuth()

    return (
        <div className="flex flex-col gap-4 mb-6">
            {/* Title and Actions Row */}
            <div className="flex lg:flex-row flex-col items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Productos del Inventario</h1>

                <div className="flex flex-wrap items-center justify-end gap-3">
                    <InventoryColumnManager
                        visibleColumns={visibleColumns}
                        onToggle={onToggleColumn}
                        onReset={onResetColumns}
                        isAdmin={user?.role === Role.Admin}
                        disabled={!columnsReady || columnsSaving}
                        saving={columnsSaving}
                        loadError={columnsLoadError}
                        onRetry={onRetryColumns}
                    />
                    {/* CREAR PRODUCTO Y DESCARGAR EXCEL, no se muestra si es store manager ni tercero */}
                    {user?.role !== Role.Vendedor && user?.role !== Role.Tercero && (
                        <InventoryActions products={rawProducts} categories={categories} />
                    )}
                </div>
            </div>
            {/* Stats Row */}
            <div className="flex items-center gap-4">
                <InventoryStats
                    totalStockCentral={totalStockCentral}
                    filteredStockTotal={filteredStockTotal}
                    uniqueProductsInCurrentPage={uniqueProductsInCurrentPage}
                    searchedProductsLength={searchedProductsLength}
                />
            </div>
        </div>
    )
}
