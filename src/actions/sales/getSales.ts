import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import type {
    ISaleListFilters,
    ISaleListMeta,
    ISaleListResponse,
    ISaleResponse,
} from "@/interfaces/sales/ISale"
import {
    normalizeSale,
    normalizeSaleOperation,
    type RawSale,
    type RawSaleOperation,
} from "@/lib/normalize-sale"
import { getChileDateMeta, toChileMiddayUTC } from "@/utils/chile-date"

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_PAGE_SIZE = 100

type RawSaleListItem = RawSale | RawSaleOperation
type RawSaleListResponse = {
    sales?: RawSaleListItem[]
    meta?: Partial<ISaleListMeta>
}

const isSaleOperation = (raw: RawSaleListItem): raw is RawSaleOperation => "sale" in raw || "dte" in raw

const normalizeListItem = (raw: RawSaleListItem, storeID: string): ISaleResponse => {
    if (isSaleOperation(raw)) return normalizeSaleOperation(raw, storeID).sale
    return normalizeSale(raw, storeID)
}

const buildSalesParams = (filters: ISaleListFilters) => {
    const params = new URLSearchParams()
    if (filters.saleType) params.set("saleType", filters.saleType)
    if (filters.status) params.set("status", filters.status)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)
    if (filters.page) params.set("page", String(filters.page))
    if (filters.limit) params.set("limit", String(filters.limit))
    return params
}

/** Obtiene una página de ventas para la tienda activa. */
export const getSalesPage = async (
    storeID: string,
    filters: ISaleListFilters = {},
): Promise<ISaleListResponse> => {
    if (!storeID) {
        return { sales: [], meta: { page: 1, limit: filters.limit ?? DEFAULT_PAGE_SIZE, total: 0 } }
    }

    const params = buildSalesParams(filters)
    const query = params.toString()
    const response = await fetcher<RawSaleListResponse | RawSale[]>(`${API_URL}/sales${query ? `?${query}` : ""}`, {
        headers: { "X-Store-ID": storeID },
    })

    if (Array.isArray(response)) {
        const sales = response.map((sale) => normalizeSale(sale, storeID))
        return { sales, meta: { page: 1, limit: sales.length, total: sales.length } }
    }

    const rawSales = Array.isArray(response.sales) ? response.sales : []
    const sales = rawSales.map((sale) => normalizeListItem(sale, storeID))
    return {
        sales,
        meta: {
            page: Number(response.meta?.page ?? filters.page ?? 1),
            limit: Number(response.meta?.limit ?? filters.limit ?? DEFAULT_PAGE_SIZE),
            total: Number(response.meta?.total ?? sales.length),
        },
    }
}

/**
 * Obtiene todas las páginas requeridas por las vistas actuales de caja y reportes.
 * Los filtros se envían al backend; el frontend solo agrega las páginas.
 */
export const getSales = async (
    storeID: string,
    filters: Omit<ISaleListFilters, "page" | "limit"> = {},
): Promise<ISaleResponse[]> => {
    if (!storeID) return []

    const firstPage = await getSalesPage(storeID, { ...filters, page: 1, limit: DEFAULT_PAGE_SIZE })
    const totalPages = Math.ceil(firstPage.meta.total / Math.max(firstPage.meta.limit, 1))
    if (totalPages <= 1) return firstPage.sales

    const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
            getSalesPage(storeID, { ...filters, page: index + 2, limit: firstPage.meta.limit }),
        ),
    )

    return [firstPage, ...remainingPages].flatMap((page) => page.sales)
}

/** Obtiene el detalle de una venta y su DTE, cuando exista. */
export const getSingleSale = async (saleID: string, storeID: string): Promise<ISaleResponse> => {
    const response = await fetcher<RawSaleOperation | RawSale>(`${API_URL}/sales/${encodeURIComponent(saleID)}`, {
        headers: { "X-Store-ID": storeID },
    })
    return isSaleOperation(response)
        ? normalizeSaleOperation(response, storeID).sale
        : normalizeSale(response, storeID)
}

/** Ventas necesarias para el resumen mensual y de los últimos siete días. */
export const getSalesForResume = async (storeID: string | undefined, refYYYYMMDD: string): Promise<ISaleResponse[]> => {
    if (!storeID || !/^\d{4}-\d{2}-\d{2}$/.test(refYYYYMMDD)) return []

    const refDate = toChileMiddayUTC(refYYYYMMDD)
    const refMeta = getChileDateMeta(refDate)
    const last7StartDayNumber = refMeta.dayNumber - 6 * DAY_MS

    const allSales = await getSales(storeID)
    return allSales.filter((sale) => {
        const saleMeta = getChileDateMeta(new Date(sale.createdAt))
        const inLast7 = saleMeta.dayNumber >= last7StartDayNumber && saleMeta.dayNumber <= refMeta.dayNumber
        const inMonth = saleMeta.year === refMeta.year && saleMeta.month === refMeta.month
        return inLast7 || inMonth
    })
}
