import type {
    ICreateReturn,
    IReturnListFilters,
    IReturnListResponse,
    IReturnOperationResponse,
} from "@/interfaces/returns/IReturn"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import {
    normalizeReturnOperation,
    type RawReturn,
    type RawReturnOperation,
} from "@/lib/normalize-return"

type RawReturnListResponse = {
    returns?: Array<RawReturnOperation | RawReturn>
    meta?: Partial<IReturnListResponse["meta"]>
}

const DEFAULT_PAGE_SIZE = 50

const buildReturnParams = (filters: IReturnListFilters) => {
    const params = new URLSearchParams()
    if (filters.saleID) params.set("saleID", filters.saleID)
    if (filters.status) params.set("status", filters.status)
    if (filters.returnType) params.set("returnType", filters.returnType)
    if (filters.page) params.set("page", String(filters.page))
    if (filters.limit) params.set("limit", String(filters.limit))
    return params
}

export const createReturn = async (
    storeID: string,
    payload: ICreateReturn,
    idempotencyKey: string,
): Promise<IReturnOperationResponse> => {
    const response = await fetcher<RawReturnOperation>(`${API_URL}/returns`, {
        method: "POST",
        headers: {
            "X-Store-ID": storeID,
            "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
    })
    return normalizeReturnOperation(response)
}

export const getReturnsPage = async (
    storeID: string,
    filters: IReturnListFilters = {},
): Promise<IReturnListResponse> => {
    if (!storeID) {
        return { returns: [], meta: { page: 1, limit: filters.limit ?? DEFAULT_PAGE_SIZE, total: 0 } }
    }

    const query = buildReturnParams(filters).toString()
    const response = await fetcher<RawReturnListResponse>(`${API_URL}/returns${query ? `?${query}` : ""}`, {
        headers: { "X-Store-ID": storeID },
    })
    const rawReturns = Array.isArray(response.returns) ? response.returns : []
    return {
        returns: rawReturns.map(normalizeReturnOperation),
        meta: {
            page: Number(response.meta?.page ?? filters.page ?? 1),
            limit: Number(response.meta?.limit ?? filters.limit ?? DEFAULT_PAGE_SIZE),
            total: Number(response.meta?.total ?? rawReturns.length),
        },
    }
}

export const getReturns = async (
    storeID: string,
    filters: Omit<IReturnListFilters, "page" | "limit"> = {},
): Promise<IReturnOperationResponse[]> => {
    const firstPage = await getReturnsPage(storeID, { ...filters, page: 1, limit: DEFAULT_PAGE_SIZE })
    const totalPages = Math.ceil(firstPage.meta.total / Math.max(firstPage.meta.limit, 1))
    if (totalPages <= 1) return firstPage.returns

    const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
            getReturnsPage(storeID, { ...filters, page: index + 2, limit: firstPage.meta.limit }),
        ),
    )
    return [firstPage, ...remainingPages].flatMap((page) => page.returns)
}

export const getReturnByID = async (returnID: string): Promise<IReturnOperationResponse> => {
    const response = await fetcher<RawReturnOperation>(`${API_URL}/returns/${encodeURIComponent(returnID)}`)
    return normalizeReturnOperation(response)
}

const runReturnTransition = async (
    returnID: string,
    storeID: string,
    transition: "approve" | "reject" | "cancel" | "reconcile",
) => {
    const response = await fetcher<RawReturnOperation>(
        `${API_URL}/returns/${encodeURIComponent(returnID)}/${transition}`,
        {
            method: "POST",
            headers: { "X-Store-ID": storeID },
        },
    )
    return normalizeReturnOperation(response)
}

export const approveReturn = (returnID: string, storeID: string) => runReturnTransition(returnID, storeID, "approve")
export const rejectReturn = (returnID: string, storeID: string) => runReturnTransition(returnID, storeID, "reject")
export const cancelReturn = (returnID: string, storeID: string) => runReturnTransition(returnID, storeID, "cancel")
export const reconcileReturn = (returnID: string, storeID: string) => runReturnTransition(returnID, storeID, "reconcile")
