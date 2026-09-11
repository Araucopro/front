import { getAllProducts } from "@/actions/products/getAllProducts"
import { getStoreStockSaleProducts } from "@/actions/inventory/getStoreStock"
import { getAllPurchaseOrders } from "@/actions/purchase-orders/getAllPurchaseOrders"
import { getSales } from "@/actions/sales/getSales"
import { getReturns } from "@/actions/returns/returnActions"
import { getAllStores } from "@/actions/stores/getAllStores"
import { getResume } from "@/actions/totals/getResume"
import { IStore } from "@/interfaces/stores/IStore"
import { IPurchaseOrder } from "@/interfaces/orders/IPurchaseOrder"
import { IResume } from "@/interfaces/sales/ISalesResume"
import { ISaleResponse } from "@/interfaces/sales/ISale"
import { IProduct } from "@/interfaces/products/IProduct"
import { getChileDateMeta, getChileYYYYMMDD, isYYYYMMDD, toChileMiddayUTC } from "@/utils/chile-date"

const DAY_MS = 24 * 60 * 60 * 1000

const isSpecialStoreFilter = (storeID: string) => ["all", "propias", "consignadas"].includes(storeID)

const getProductsForSale = async (storeID: string) => {
    if (!isSpecialStoreFilter(storeID)) {
        try {
            return await getStoreStockSaleProducts(storeID)
        } catch (error) {
            console.warn("buildHomeViewModel: fallback to full products after store stock error:", error)
        }
    }

    return getAllProducts()
}

type HomeTableItem = ISaleResponse | (IPurchaseOrder & { isOrder: true })

const matchesStoreScope = (storeID: string, store: IStore): boolean => {
    if (storeID === "all") return true
    if (storeID === "propias") return store.isCentralStore === true
    if (storeID === "consignadas") return store.isCentralStore === false
    return store.storeID === storeID
}

const buildStoreIndex = (stores: IStore[]) => new Map(stores.map((store) => [store.storeID, store] as const))

const filterSalesByScope = (
    sales: ISaleResponse[],
    storeID: string,
    storeIndex: Map<string, IStore>,
): ISaleResponse[] => {
    return sales.filter((sale) => {
        const saleStore = storeIndex.get(sale.storeID)
        return saleStore ? matchesStoreScope(storeID, saleStore) : false
    })
}

const filterSalesForResume = (sales: ISaleResponse[], refYYYYMMDD: string): ISaleResponse[] => {
    const refDate = toChileMiddayUTC(refYYYYMMDD)
    const refMeta = getChileDateMeta(refDate)
    const last7StartDayNumber = refMeta.dayNumber - 6 * DAY_MS

    return sales.filter((sale) => {
        const saleMeta = getChileDateMeta(new Date(sale.createdAt))
        const inLast7 = saleMeta.dayNumber >= last7StartDayNumber && saleMeta.dayNumber <= refMeta.dayNumber
        const inMonth = saleMeta.year === refMeta.year && saleMeta.month === refMeta.month
        return inLast7 || inMonth
    })
}

const filterOrdersByScope = (
    orders: IPurchaseOrder[],
    storeID: string,
    storeIndex: Map<string, IStore>,
): (IPurchaseOrder & { isOrder: true })[] => {
    return orders
        .filter((order) => {
            const orderStore = storeIndex.get(order.storeID)
            return orderStore ? matchesStoreScope(storeID, orderStore) : false
        })
        .map((order) => ({ ...order, isOrder: true as const }))
}

const getCreatedAtTime = (item: HomeTableItem) => {
    const time = Date.parse(item.createdAt)
    return Number.isNaN(time) ? 0 : time
}

const sortByCreatedAtDesc = (items: HomeTableItem[]): HomeTableItem[] => {
    return [...items].sort((a, b) => getCreatedAtTime(b) - getCreatedAtTime(a))
}

type ProductLookup = {
    byVariationID: Map<string, { productName?: string; sku?: string; size?: string }>
    byStoreProductID: Map<string, { productName?: string; sku?: string; size?: string }>
}

const buildProductLookup = (products: IProduct[]): ProductLookup => {
    const byVariationID = new Map<string, { productName?: string; sku?: string; size?: string }>()
    const byStoreProductID = new Map<string, { productName?: string; sku?: string; size?: string }>()

    for (const product of products) {
        for (const variation of product.ProductVariations ?? []) {
            const details = {
                productName: product.name,
                sku: variation.sku,
                size: variation.sizeNumber,
            }

            if (variation.variationID) {
                byVariationID.set(variation.variationID, details)
            }

            for (const storeProduct of variation.StoreProducts ?? []) {
                if (storeProduct.storeProductID) {
                    byStoreProductID.set(storeProduct.storeProductID, details)
                }
            }
        }
    }

    return { byVariationID, byStoreProductID }
}

const enrichSalesProductNames = (sales: ISaleResponse[], products: IProduct[]): ISaleResponse[] => {
    const productLookup = buildProductLookup(products)

    return sales.map((sale) => ({
        ...sale,
        SaleProducts: sale.SaleProducts.map((saleProduct) => {
            const productDetails =
                productLookup.byStoreProductID.get(saleProduct.storeProductID ?? "") ??
                productLookup.byVariationID.get(saleProduct.variationID) ??
                productLookup.byVariationID.get(saleProduct.variation?.variationID)

            return {
                ...saleProduct,
                productName: saleProduct.productName ?? productDetails?.productName,
                variation: {
                    ...saleProduct.variation,
                    sku: saleProduct.variation?.sku || productDetails?.sku || "",
                    size: saleProduct.variation?.size || productDetails?.size || "",
                },
            }
        }),
    }))
}

const attachReturnsToSales = async (storeID: string): Promise<ISaleResponse[]> => {
    const [sales, returnOperations] = await Promise.all([
        getSales(storeID),
        getReturns(storeID).catch((error) => {
            console.warn("buildHomeViewModel: no fue posible cargar devoluciones:", error)
            return []
        }),
    ])
    const returnsBySale = new Map<string, ISaleResponse["Returns"]>()
    for (const { ret } of returnOperations) {
        returnsBySale.set(ret.saleID, [...(returnsBySale.get(ret.saleID) ?? []), ret])
    }
    return sales.map((sale) => ({
        ...sale,
        Returns: returnsBySale.get(sale.saleID) ?? sale.Returns,
    }))
}

export type HomeViewModel = {
    stores: IStore[]
    storeID: string
    date: string
    chartStoreID: string
    sales: ISaleResponse[]
    resume: IResume
    allSalesForResume: ISaleResponse[]
    purchaseOrders: (IPurchaseOrder & { isOrder: true })[]
    items: HomeTableItem[]
    allProducts: Awaited<ReturnType<typeof getProductsForSale>>
    dateRef: Date
}

export const buildHomeViewModel = async (rawStoreID: string, rawDate: string): Promise<HomeViewModel | null> => {
    if (!rawStoreID) {
        return null
    }
    const storeID = rawStoreID

    const date = isYYYYMMDD(rawDate) ? rawDate : getChileYYYYMMDD(new Date())
    const dateRef = toChileMiddayUTC(date)
    const specialFilter = isSpecialStoreFilter(storeID)
    // Estas consultas no dependen de la tienda activa y pueden iniciar en paralelo.
    const storesPromise = getAllStores()
    const allOrdersPromise = getAllPurchaseOrders()
    const allProductsPromise = getProductsForSale(storeID)
    const productCatalogPromise = specialFilter ? allProductsPromise : getAllProducts()

    const stores = await storesPromise
    if (stores.length === 0) {
        return null
    }

    const storeIndex = buildStoreIndex(stores)
    const chartStoreID = specialFilter ? (stores[0]?.storeID ?? storeID) : storeID
    const salesStores = stores.filter((store) => matchesStoreScope(storeID, store))
    const salesPromise = Promise.all(salesStores.map((store) => attachReturnsToSales(store.storeID))).then((pages) =>
        pages.flat(),
    )

    const [salesSource, resume, allOrders, allProducts, productCatalog] = await Promise.all([
        salesPromise,
        getResume(chartStoreID || "", date),
        allOrdersPromise,
        allProductsPromise,
        productCatalogPromise,
    ])

    const salesWithProductNames = enrichSalesProductNames(salesSource, [...productCatalog, ...allProducts])
    const salesWithStores = salesWithProductNames.map((sale) => ({
        ...sale,
        Store: storeIndex.get(sale.storeID) ?? sale.Store,
    }))
    const tableSales = filterSalesByScope(salesWithStores, storeID, storeIndex)
    const scopedResumeSales = filterSalesForResume(tableSales, date)
    const allSalesForResume = scopedResumeSales
    const purchaseOrders = filterOrdersByScope(allOrders, storeID, storeIndex)
    const items = sortByCreatedAtDesc([...tableSales, ...purchaseOrders])

    return {
        stores,
        storeID,
        date,
        chartStoreID,
        sales: tableSales,
        resume,
        allSalesForResume,
        purchaseOrders,
        items,
        allProducts,
        dateRef,
    }
}
