import { getAllProducts } from "@/actions/products/getAllProducts"
import { getInventoryProducts } from "@/actions/products/getInventoryProducts"
import { getStoreStockSaleProducts } from "@/actions/inventory/getStoreStock"
import { checkStatus } from "@/actions/auth/authActions"
import { getMyStores } from "@/actions/stores/getAllStores"
import { getStoreById } from "@/actions/stores/getStoreById"
import { SaleForm } from "@/components/CreateSale/SaleForm"
import { resolveAccessibleStoreID } from "@/lib/store-access"
import { Role } from "@/lib/userRoles"
import { normalizeProduct } from "@/lib/normalize-product"

import { Suspense } from "react"
export const revalidate = 0

type CreateSaleProps = {
    searchParams?: Promise<{ storeID?: string | string[] }>
}

const SPECIAL_STORE_FILTERS = new Set(["all", "propias", "consignadas"])

const parseParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value)

const getProductsForSale = async (storeID?: string, allowNegativeStock = false) => {
    if (storeID && !SPECIAL_STORE_FILTERS.has(storeID)) {
        if (allowNegativeStock) {
            try {
                const completeCatalog = (await getInventoryProducts()).map(normalizeProduct)
                const productsAssignedToStore = completeCatalog
                    .map((product) => {
                        const ProductVariations = product.ProductVariations.filter((variation) =>
                            variation.StoreProducts?.some((storeProduct) => storeProduct.storeID === storeID),
                        )

                        return {
                            ...product,
                            ProductVariations,
                            stock: ProductVariations.reduce((sum, variation) => {
                                const storeProduct = variation.StoreProducts?.find(
                                    (item) => item.storeID === storeID,
                                )
                                return sum + (storeProduct?.quantity ?? 0)
                            }, 0),
                        }
                    })
                    .filter((product) => product.ProductVariations.length > 0)

                if (productsAssignedToStore.length > 0) return productsAssignedToStore
            } catch (error) {
                console.warn("CreateSale: fallback after complete catalog error:", error)
            }
        }

        try {
            return await getStoreStockSaleProducts(storeID, { includeOutOfStock: allowNegativeStock })
        } catch (error) {
            console.warn("CreateSale: fallback to full products after store stock error:", error)
        }
    }

    return getAllProducts()
}

const CreateSale = async ({ searchParams }: CreateSaleProps) => {
    const resolvedSearchParams = await searchParams
    const requestedStoreID = parseParam(resolvedSearchParams?.storeID)
    const [auth, stores] = await Promise.all([checkStatus().catch(() => null), getMyStores()])
    const storeID = resolveAccessibleStoreID(requestedStoreID, stores, auth?.user?.role === Role.Admin)
    const accessibleStore = stores.find((store) => store.storeID === storeID)
    const storeSettings = storeID
        ? await getStoreById(storeID).catch(() => accessibleStore)
        : accessibleStore
    const productsData = await getProductsForSale(storeID, storeSettings?.allowNegativeStock ?? false)

    return (
        <main className="min-h-screen p-4">
            <div className="max-w-4xl mx-auto dark:bg-slate-800 bg-white shadow-xl rounded-2xl p-6">
                <h1 className="text-2xl font-bold dark:text-white text-gray-800 mb-4">Sección de Ventas</h1>
                <Suspense fallback={null}>
                    <SaleForm initialProducts={productsData} storeSettings={storeSettings} />
                </Suspense>
            </div>
        </main>
    )
}

export default CreateSale
