import { getAllProducts } from "@/actions/products/getAllProducts"
import { getStoreStockSaleProducts } from "@/actions/inventory/getStoreStock"
import { checkStatus } from "@/actions/auth/authActions"
import { getMyStores } from "@/actions/stores/getAllStores"
import { SaleForm } from "@/components/CreateSale/SaleForm"
import { resolveAccessibleStoreID } from "@/lib/store-access"
import { Role } from "@/lib/userRoles"

import { Suspense } from "react"
export const revalidate = 0

type CreateSaleProps = {
    searchParams?: Promise<{ storeID?: string | string[] }>
}

const SPECIAL_STORE_FILTERS = new Set(["all", "propias", "consignadas"])

const parseParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value)

const getProductsForSale = async (storeID?: string) => {
    if (storeID && !SPECIAL_STORE_FILTERS.has(storeID)) {
        try {
            return await getStoreStockSaleProducts(storeID)
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
    const productsData = await getProductsForSale(storeID)

    return (
        <main className="min-h-screen p-4">
            <div className="max-w-4xl mx-auto dark:bg-slate-800 bg-white shadow-xl rounded-2xl p-6">
                <h1 className="text-2xl font-bold dark:text-white text-gray-800 mb-4">Sección de Ventas</h1>
                <Suspense fallback={null}>
                    <SaleForm initialProducts={productsData} />
                </Suspense>
            </div>
        </main>
    )
}

export default CreateSale
