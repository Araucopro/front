import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import type {
    IDispatchGuideListFilters,
    IDispatchGuideListMeta,
    IDispatchGuideListResponse,
    IDispatchGuideOperationResponse,
} from "@/interfaces/dispatch-guides/IDispatchGuide"

const DEFAULT_PAGE_SIZE = 50

type RawDispatchGuideListResponse = {
    dispatchGuides?: IDispatchGuideOperationResponse[]
    meta?: Partial<IDispatchGuideListMeta>
}

const buildDispatchGuideParams = (filters: IDispatchGuideListFilters) => {
    const params = new URLSearchParams()
    if (filters.status) params.set("status", filters.status)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)
    if (filters.page) params.set("page", String(filters.page))
    if (filters.limit) params.set("limit", String(filters.limit))
    return params
}

export const getDispatchGuidePage = async (
    storeID: string,
    filters: IDispatchGuideListFilters = {},
): Promise<IDispatchGuideListResponse> => {
    if (!storeID) {
        return {
            dispatchGuides: [],
            meta: { page: 1, limit: filters.limit ?? DEFAULT_PAGE_SIZE, total: 0 },
        }
    }

    const params = buildDispatchGuideParams({
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
        ...filters,
    })
    const query = params.toString()
    const response = await fetcher<RawDispatchGuideListResponse>(
        `${API_URL}/dispatch-guides${query ? `?${query}` : ""}`,
        {
            headers: { "X-Store-ID": storeID },
        },
    )

    return {
        dispatchGuides: Array.isArray(response.dispatchGuides) ? response.dispatchGuides : [],
        meta: {
            page: Number(response.meta?.page ?? filters.page ?? 1),
            limit: Number(response.meta?.limit ?? filters.limit ?? DEFAULT_PAGE_SIZE),
            total: Number(response.meta?.total ?? response.dispatchGuides?.length ?? 0),
        },
    }
}

export const getDispatchGuideById = async (
    dispatchGuideID: string,
): Promise<IDispatchGuideOperationResponse> => {
    return fetcher<IDispatchGuideOperationResponse>(
        `${API_URL}/dispatch-guides/${encodeURIComponent(dispatchGuideID)}`,
    )
}
