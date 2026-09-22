import type { IStore } from "@/interfaces/stores/IStore"

export const SPECIAL_STORE_FILTERS = new Set(["all", "propias", "consignadas"])

export const isSpecialStoreFilter = (storeID?: string | null) =>
    Boolean(storeID && SPECIAL_STORE_FILTERS.has(storeID))

export function resolveAccessibleStoreID(
    requestedStoreID: string | null | undefined,
    stores: IStore[],
    allowSpecialFilters = false,
) {
    if (requestedStoreID && allowSpecialFilters && isSpecialStoreFilter(requestedStoreID)) {
        return requestedStoreID
    }

    if (requestedStoreID && stores.some((store) => store.storeID === requestedStoreID)) {
        return requestedStoreID
    }

    return stores[0]?.storeID ?? ""
}
