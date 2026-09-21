"use client"

import { useMemo, useEffect } from "react"
import { useAuth } from "@/stores/user.store"
import { useTienda } from "@/stores/tienda.store"
import { inventoryStore } from "@/stores/inventory.store"
import { applyColumnFilters, applyVariationFilters } from "@/components/Inventory/TableSection/ColumnFilters"
import { Role } from "@/lib/userRoles"
import type { IStore } from "@/interfaces/stores/IStore"
import type { IRawProduct } from "@/interfaces/products/IRawProduct"
import type { FlattenedItem } from "@/interfaces/products/IFlatternProduct"
import type { ICategory } from "@/interfaces/categories/ICategory"

const ITEMS_PER_PAGE = 20

export function useInventory(initialProducts: IRawProduct[], stores: IStore[], categories: ICategory[]) {
    const { user } = useAuth()
    const { storeSelected } = useTienda()
    const { rawProducts, setRawProducts, columnFilters, currentPage, setCurrentPage } = inventoryStore()

    const userStoreID = storeSelected?.storeID

    const filteredInitialProducts = useMemo(() => {
        if (user?.role === Role.Admin || user?.role === Role.Tercero || !userStoreID) return initialProducts
        return initialProducts.filter((product) =>
            (product.variations || []).some((variation) =>
                variation.storeProducts?.some((sp) => sp.storeID === userStoreID),
            ),
        )
    }, [initialProducts, user?.role, userStoreID])

    useEffect(() => {
        setRawProducts(filteredInitialProducts)
        setCurrentPage(1)
    }, [filteredInitialProducts, setCurrentPage, setRawProducts])

    const adminStoreIDs = useMemo(() => stores.filter((s) => s.isAdminStore).map((s) => s.storeID), [stores])

    const result = useMemo(() => {
        return applyColumnFilters(rawProducts, columnFilters, categories)
    }, [rawProducts, columnFilters, categories])

    const filteredProducts = result.filteredProducts
    const totalStock = result.totalStock

    const flattenedProducts = useMemo<FlattenedItem[]>(() => {
        const flattened: any[] = []
        filteredProducts.forEach((product) => {
            const totalStockQuantity = (product.variations || []).reduce(
                (total: number, v: any) => total + (v.storeProducts || []).reduce((acc: number, sp: any) => acc + (sp.stock || 0), 0),
                0,
            )
            const variationCount = (product.variations || []).length
            ;(product.variations || []).forEach((variation: any, index: number) => {
                flattened.push({
                    product,
                    variation,
                    isFirst: index === 0,
                    totalStock: totalStockQuantity,
                    rowSpan: variationCount,
                })
            })
        })

        return applyVariationFilters(flattened, columnFilters, adminStoreIDs)
    }, [filteredProducts, columnFilters, adminStoreIDs])

    // Se implementa paginación que mantiene productos agrupados
    const paginatedItems = useMemo(() => {
        const pages = []
        let currentPage: FlattenedItem[] = []
        let currentVariationCount = 0

        // Se agrupan productos por ID
        const groupedProducts = flattenedProducts.reduce(
            (groups, item) => {
                const productId = item.product.productID
                if (!groups[productId]) {
                    groups[productId] = []
                }
                groups[productId].push(item)
                return groups
            },
            {} as Record<string, FlattenedItem[]>,
        )

        // Iterar sobre los grupos de productos
        for (const productGroup of Object.values(groupedProducts)) {
            const variationCount = productGroup.length

            // Si añadir este producto excedería el límite de la página actual
            if (currentVariationCount > 0 && currentVariationCount + variationCount > ITEMS_PER_PAGE) {
                pages.push(currentPage)
                currentPage = []
                currentVariationCount = 0
            }

            // Añadir todas las variaciones del producto actual
            productGroup.forEach((item, index) => {
                currentPage.push({
                    ...item,
                    isFirst: index === 0,
                    rowSpan: variationCount, // Use the count of filtered variations for this product
                })
            })
            currentVariationCount += variationCount
        }

        // Añadir la última página si tiene elementos
        if (currentPage.length > 0) {
            pages.push(currentPage)
        }

        return pages
    }, [flattenedProducts])

    const totalPages = paginatedItems.length

    const currentItems = useMemo(() => paginatedItems[currentPage - 1] || [], [paginatedItems, currentPage])

    const uniqueProductsInCurrentPage = useMemo(() => {
        const uniqueProductIds = new Set()
        currentItems.forEach(({ product }) => uniqueProductIds.add(product.productID))
        return uniqueProductIds.size
    }, [currentItems])

    const totalStockShown = useMemo(() => {
        if (user?.role === Role.Admin || user?.role === Role.Tercero) {
            return rawProducts.reduce((total, product) => {
                const inner = (product.variations || []).reduce((sum: number, v: any) => {
                    const storeProductsStock = (v.storeProducts || []).reduce((acc: number, sp: any) => acc + (sp.stock || 0), 0)
                    return sum + storeProductsStock
                }, 0)
                return total + inner
            }, 0)
        } else if (user?.role === Role.Vendedor && userStoreID) {
            return rawProducts.reduce((total, product) => {
                const inner = (product.variations || []).reduce((sum: number, v: any) => {
                    const storeProduct = v.storeProducts?.find((sp: any) => sp.storeID === userStoreID)
                    return sum + (storeProduct ? storeProduct.stock : 0)
                }, 0)
                return total + inner
            }, 0)
        } else {
            return 0
        }
    }, [rawProducts, user?.role, userStoreID])

    useEffect(() => {
        setCurrentPage(1)
    }, [columnFilters, setCurrentPage])

    const getVisiblePages = () => {
        const pages: (number | "...")[] = []
        const maxVisiblePages = 5
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, "...", totalPages)
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
            } else {
                pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages)
            }
        }
        return pages
    }

    return {
        user,
        rawProducts,
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
        filteredStockTotal: totalStock,
    }
}
