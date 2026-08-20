import { getAllProducts } from "@/actions/products/getAllProducts"
import { getStoreStockSaleProducts } from "@/actions/inventory/getStoreStock"
import { getOffers } from "@/actions/pricing/getOffers"
import { DiscountManagementPanel } from "@/components/Discounts/DiscountManagementPanel"

type InventoryDiscountsPageProps = {
    searchParams?: Promise<{ storeID?: string | string[] }>
}

const SPECIAL_STORE_FILTERS = new Set(["all", "propias", "consignadas"])

const parseParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value)

const getDiscountProducts = async (storeID?: string) => {
    if (storeID && !SPECIAL_STORE_FILTERS.has(storeID)) {
        try {
            return await getStoreStockSaleProducts(storeID)
        } catch (error) {
            console.warn("InventoryDiscountsPage: fallback to full products after store stock error:", error)
        }
    }

    return getAllProducts()
}

const InventoryDiscountsPage = async ({ searchParams }: InventoryDiscountsPageProps) => {
    const resolvedSearchParams = await searchParams
    const storeID = parseParam(resolvedSearchParams?.storeID)
    const [products, offers] = await Promise.all([getDiscountProducts(storeID), getOffers()])

    return (
        <main className="min-h-screen bg-slate-50 py-6 dark:bg-slate-900">
            <div className="mx-auto max-w-[1580px] px-4">
                <DiscountManagementPanel products={products} offers={offers} />
            </div>
        </main>
    )
}

export default InventoryDiscountsPage
