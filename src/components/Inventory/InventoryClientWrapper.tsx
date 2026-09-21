"use client"

import React, { Suspense, useEffect } from "react"
import { toast } from "sonner"
import { MotionItem } from "@/components/Animations/motionItem"
import { CategoryProgress } from "../CategorySection/CategoryProgress"
import InventoryPagination from "@/components/Inventory/TableSection/InventoryPagination"
import { ColumnFilters } from "@/components/Inventory/TableSection/ColumnFilters"
import { createMassiveProducts } from "@/actions/products/createMassiveProducts"
import { deleteProduct } from "@/actions/products/deleteProduct"
import type { ICategory } from "@/interfaces/categories/ICategory"
import type { IStore } from "@/interfaces/stores/IStore"
import type { IRawProduct } from "@/interfaces/products/IRawProduct"
import { useAuth } from "@/stores/user.store"
import { useTienda } from "@/stores/tienda.store"
import { Role } from "@/lib/userRoles"
import { CreateProductFormData } from "@/interfaces/products/ICreateProductForm"
import { inventoryStore } from "@/stores/inventory.store"
import { useCategories } from "@/stores/categories.store"
import { InventoryTable } from "./TableSection/InventoryTable"
import InventoryHeader from "./HeaderSetion/InventoryHeader"
import { useInventory } from "@/hooks/useInventory"
import { createInventoryMovement } from "@/actions/inventory/createInventoryMovement"

interface Props {
    initialProducts: IRawProduct[]
    categories: ICategory[]
    stores: IStore[]
}

export default function UnifiedInventoryClientWrapper({ initialProducts, categories: cats, stores }: Props) {
    const { user } = useAuth()
    const { storeSelected } = useTienda()
    const { categories, setCategories } = useCategories()
    const {
        rawProducts,
        setRawProducts,
        columnFilters,
        handleFilterChange,
        clearColumnFilters,
        setEditingField,
        editValue,
    } = inventoryStore()

    const {
        currentItems,
        totalPages,
        currentPage,
        uniqueProductsInCurrentPage,
        totalStockShown,
        filteredProducts,
        flattenedProducts,
        adminStoreIDs,
        getVisiblePages,
        setCurrentPage,
        filteredStockTotal,
    } = useInventory(initialProducts, stores, categories)

    useEffect(() => {
        setCategories(cats)
    }, [])

    useEffect(() => {
        return () => {
            clearColumnFilters()
        }
    }, [])

    function handleDeleteProduct(product: any) {
        const variationCount = product.variations?.length ?? 0
        toast.warning(`¿Eliminar "${product.name}"?`, {
            description: `Se eliminarán el producto y ${variationCount} variación${variationCount !== 1 ? "es" : ""}. Esta acción no se puede revertir.`,
            duration: 10000,
            action: {
                label: "Sí, eliminar",
                onClick: () => {
                    toast.promise(deleteProduct(product.productID), {
                        loading: "Eliminando producto...",
                        success: () => {
                            setRawProducts(rawProducts.filter((p) => p.productID !== product.productID))
                            return "Producto eliminado con éxito"
                        },
                        error: "Hubo un error al eliminar el producto",
                    })
                },
            },
            cancel: {
                label: "Cancelar",
                onClick: () => {},
            },
        })
    }

    async function handleSaveEdit(product: any, variationID?: string) {
        const editingField = inventoryStore.getState().editingField
        if (!editingField) return
        const { field } = editingField
        const isEditingBrand = field === "brand"
        const isProductBrand = product.brand === "D3SI" || product.brand === "Otro"
        const isEmptyCategory = product.categoryID === ""

        if (!variationID) {
            const updated = {
                name: field === "name" ? editValue : product.name,
                image: product.image,
                genre: product.genre,
                brand: isEditingBrand ? editValue : isProductBrand ? product.brand : "Otro",
                categoryID: isEmptyCategory ? null : product.categoryID,
                sizes: product.variations.map((v: any) => {
                    const sp =
                        v.storeProducts?.find((s: any) => s.storeID === storeSelected?.storeID) || v.storeProducts?.[0]
                    return {
                        sku: v.sku,
                        sizeNumber: v.size,
                        priceList: sp?.priceList || 0,
                        priceCost: sp?.priceCost || 0,
                        stockQuantity: sp?.stock || 0,
                    }
                }),
            } as CreateProductFormData
            toast.promise(createMassiveProducts({ products: [updated] }), {
                loading: "Actualizando producto...",
                success: () => {
                    setRawProducts(
                        rawProducts.map((p) => (p.productID === product.productID ? { ...p, [field]: editValue } : p)),
                    )
                    setEditingField(null)
                    return "Campo actualizado"
                },
                error: "Error al actualizar",
            })
            return
        }

        const variation = product.variations.find((v: any) => v.variationID === variationID)
        if (!variation) return
        const sp =
            variation.storeProducts?.find((s: any) => s.storeID === storeSelected?.storeID) ||
            variation.storeProducts?.[0]
        const currentStock = sp?.stock || 0
        const currentPriceList = sp?.priceList || 0
        const currentPriceCost = sp?.priceCost || 0

        const newStockValue = field === "stockQuantity" ? Number(editValue) : currentStock
        const updated = {
            name: product.name,
            image: product.image,
            genre: product.genre,
            brand: isProductBrand ? product.brand : "Otro",
            categoryID: isEmptyCategory ? null : product.categoryID,
            sizes: [
                {
                    sku: variation.sku,
                    sizeNumber: field === "sizeNumber" ? editValue : variation.size,
                    priceList: field === "priceList" ? Number(editValue) : currentPriceList,
                    priceCost: field === "priceCost" ? Number(editValue) : currentPriceCost,
                    stockQuantity: newStockValue,
                },
            ],
        } as CreateProductFormData

        toast.promise(
            createMassiveProducts({ products: [updated] }).then(async (res) => {
                // Si se editó el stock, registrar el movimiento en el módulo de inventario
                if (field === "stockQuantity" && storeSelected?.storeID) {
                    const diff = newStockValue - currentStock
                    try {
                        await createInventoryMovement({
                            storeID: storeSelected.storeID,
                            variationID: variation.variationID,
                            reason: "ADJUSTMENT",
                            quantity: diff,
                            newStock: newStockValue,
                        })
                    } catch (e) {
                        console.warn("Movimiento de inventario no registrado:", e)
                    }
                }
                return res
            }),
            {
                loading: "Actualizando producto...",
                success: () => {
                    setRawProducts(
                        rawProducts.map((p) =>
                            p.productID === product.productID
                                ? {
                                      ...p,
                                      variations: p.variations.map((v: any) =>
                                          v.variationID === variationID
                                              ? {
                                                    ...v,
                                                    ...(field === "sizeNumber" ? { size: editValue } : {}),
                                                    storeProducts: (v.storeProducts || []).map((s: any) =>
                                                        s.storeID === storeSelected?.storeID
                                                            ? {
                                                                  ...s,
                                                                  ...(field === "stockQuantity"
                                                                      ? { stock: Number(editValue) }
                                                                      : {}),
                                                                  ...(field === "priceList"
                                                                      ? { priceList: Number(editValue) }
                                                                      : {}),
                                                                  ...(field === "priceCost"
                                                                      ? { priceCost: Number(editValue) }
                                                                      : {}),
                                                              }
                                                            : s,
                                                    ),
                                                }
                                              : v,
                                      ),
                                  }
                                : p,
                        ),
                    )
                    setEditingField(null)
                    return "Campo actualizado"
                },
                error: "Error al actualizar",
            },
        )
    }

    return (
        <main className="lg:p-6 flex-1 flex flex-col h-screen">
            {user?.role !== Role.Vendedor && user?.role !== Role.Tercero && (
                <MotionItem delay={1}>
                    <CategoryProgress products={filteredProducts} categories={categories} />
                </MotionItem>
            )}

            <MotionItem delay={0}>
                <InventoryHeader
                    totalStockCentral={totalStockShown}
                    filteredStockTotal={filteredStockTotal}
                    uniqueProductsInCurrentPage={uniqueProductsInCurrentPage}
                    searchedProductsLength={filteredProducts.length}
                    categories={categories}
                />
                <div className="flex justify-between lg:mt-0 mt-6 lg:flex-row flex-col lg:items-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Página {currentPage} de {totalPages} - {filteredProducts.length} productos (
                        {flattenedProducts.length} variaciones)
                    </p>
                </div>
            </MotionItem>

            <div className="flex-1 flex flex-col">
                <MotionItem delay={2} className="flex-1">
                    <div className="flex-1 dark:bg-slate-900 bg-white shadow rounded overflow-hidden">
                        <ColumnFilters
                            filters={columnFilters}
                            onFilterChange={handleFilterChange}
                            onClearFilters={clearColumnFilters}
                            showPrecioCosto={user?.role !== Role.Vendedor && user?.role !== Role.Tercero}
                            showStockAgregado={user?.role === Role.Admin}
                        />

                        <Suspense fallback={"cargando..."}>
                            <InventoryTable
                                currentItems={currentItems}
                                handleSaveEdit={handleSaveEdit}
                                handleDeleteProduct={handleDeleteProduct}
                                adminStoreIDs={adminStoreIDs}
                                categories={categories}
                            />
                        </Suspense>
                    </div>
                </MotionItem>

                {totalPages > 1 && (
                    <MotionItem delay={currentItems.length + 3}>
                        <InventoryPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            getVisiblePages={getVisiblePages}
                            setCurrentPage={setCurrentPage}
                        />
                    </MotionItem>
                )}
            </div>
        </main>
    )
}
