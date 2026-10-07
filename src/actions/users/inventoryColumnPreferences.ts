import type {
    IInventoryColumnPreferenceQuery,
    IInventoryColumnPreferenceResponse,
    IUpdateInventoryColumnPreference,
} from "@/interfaces/users/IInventoryColumnPreference"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"

const buildPreferenceUrl = (query: IInventoryColumnPreferenceQuery) => {
    const params = new URLSearchParams()
    if (query.storeID !== undefined) params.set("storeID", query.storeID)
    else params.set("storeFilter", query.storeFilter)
    return `${API_URL}/users/me/preferences/inventory-columns?${params}`
}

export function getInventoryColumnPreference(
    query: IInventoryColumnPreferenceQuery,
    signal?: AbortSignal,
): Promise<IInventoryColumnPreferenceResponse> {
    return fetcher<IInventoryColumnPreferenceResponse>(buildPreferenceUrl(query), { signal })
}

export function replaceInventoryColumnPreference(
    query: IInventoryColumnPreferenceQuery,
    payload: IUpdateInventoryColumnPreference,
): Promise<IInventoryColumnPreferenceResponse> {
    return fetcher<IInventoryColumnPreferenceResponse>(buildPreferenceUrl(query), {
        method: "PUT",
        body: JSON.stringify(payload),
    })
}
