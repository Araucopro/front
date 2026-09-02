import type { IClientsQuery, IClientsResponse } from "@/interfaces/clients/IClient"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"

export const getClients = async (query: IClientsQuery = {}, options?: RequestInit): Promise<IClientsResponse> => {
    const params = new URLSearchParams()

    if (query.page) params.set("page", query.page.toString())
    if (query.limit) params.set("limit", query.limit.toString())
    if (query.search?.trim()) params.set("search", query.search.trim())
    if (query.segment) params.set("segment", query.segment)

    const searchParams = params.toString()
    const url = searchParams ? `${API_URL}/clients?${searchParams}` : `${API_URL}/clients`

    const response = await fetcher<IClientsResponse>(url, options)

    return {
        clients: Array.isArray(response.clients) ? response.clients : [],
        meta: response.meta ?? { page: query.page ?? 1, limit: query.limit ?? 50, total: 0 },
    }
}
