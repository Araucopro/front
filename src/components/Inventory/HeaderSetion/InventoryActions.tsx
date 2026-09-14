"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { IProduct } from "@/interfaces/products/IProduct"
import type { IRawProduct } from "@/interfaces/products/IRawProduct"
import type { ICategory } from "@/interfaces/categories/ICategory"
import { exportInventoryToExcel } from "@/utils/exportInventoryToExcel"
import { Button } from "@/components/ui/button"
import { CategoryManagementModal } from "@/components/CategorySection/EditCategory/CategoryManagementModal"
import { useTienda } from "@/stores/tienda.store"

interface InventoryActionsProps {
    products: Array<IProduct | IRawProduct>
    categories: ICategory[]
}

export default function InventoryActions({ products, categories }: InventoryActionsProps) {
    const router = useRouter()
    const { storeSelected } = useTienda()
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const createProductRoute = storeSelected?.storeID
        ? `/home/inventory/create?storeID=${storeSelected.storeID}`
        : "/home/inventory/create"

    const handleDownloadExcel = () => {
        if (!products || products.length === 0) {
            alert("No hay productos para exportar.")
            return
        }
        exportInventoryToExcel(products, categories)
    }

    return (
        <div className="flex gap-3">
            <Button onClick={() => setShowCategoryModal(true)} className="bg-gray-600 text-white px-4 py-2 rounded">
                Administrar Categorías
            </Button>
            <Button
                onClick={() => router.push(createProductRoute)}
                className="bg-green-600 text-white px-4 py-2 rounded"
            >
                Crear Producto
            </Button>
            <Button onClick={handleDownloadExcel} className="bg-blue-600 text-white px-4 py-2 rounded">
                Descargar Excel
            </Button>
            <CategoryManagementModal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} />
        </div>
    )
}
