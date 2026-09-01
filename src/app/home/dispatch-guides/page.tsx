import { getDispatchGuidePage } from "@/actions/dispatch-guides/getDispatchGuides"
import { getAllProducts } from "@/actions/products/getAllProducts"
import { getStoreStockSaleProducts } from "@/actions/inventory/getStoreStock"
import DispatchGuidesClient from "@/components/DispatchGuides/DispatchGuidesClient"
import type {
    DispatchGuideStatus,
    IDispatchGuideListFilters,
} from "@/interfaces/dispatch-guides/IDispatchGuide"

export const revalidate = 0

type DispatchGuidesPageProps = {
    searchParams?: Promise<{
        storeID?: string | string[]
        status?: string | string[]
        from?: string | string[]
        to?: string | string[]
    }>
}

const SPECIAL_STORE_FILTERS = new Set(["all", "propias", "consignadas"])
const STATUSES = new Set(["PENDIENTE", "EMITIDA", "ANULACION_PENDIENTE", "ANULADA"])

const parseParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value)

const getProductsForGuide = async (storeID?: string) => {
    if (storeID && !SPECIAL_STORE_FILTERS.has(storeID)) {
        try {
            return await getStoreStockSaleProducts(storeID)
        } catch (error) {
            console.warn("DispatchGuidesPage: fallback to full products after store stock error:", error)
        }
    }

    return getAllProducts()
}

export default async function DispatchGuidesPage({ searchParams }: DispatchGuidesPageProps) {
    const resolvedSearchParams = await searchParams
    const storeID = parseParam(resolvedSearchParams?.storeID)
    const status = parseParam(resolvedSearchParams?.status)
    const from = parseParam(resolvedSearchParams?.from)
    const to = parseParam(resolvedSearchParams?.to)
    const effectiveStoreID = storeID && !SPECIAL_STORE_FILTERS.has(storeID) ? storeID : ""
    const filters: IDispatchGuideListFilters = {
        status: status && STATUSES.has(status) ? (status as DispatchGuideStatus) : undefined,
        from,
        to,
        page: 1,
        limit: 50,
    }

    const [guidesPage, products] = await Promise.all([
        effectiveStoreID ? getDispatchGuidePage(effectiveStoreID, filters) : getDispatchGuidePage("", filters),
        getProductsForGuide(effectiveStoreID),
    ])

    return (
        <main className="flex min-h-screen flex-col p-6">
            <DispatchGuidesClient
                initialGuides={guidesPage.dispatchGuides}
                initialMeta={guidesPage.meta}
                initialProducts={products}
                initialStoreID={effectiveStoreID}
                initialFilters={filters}
            />
        </main>
    )
}
