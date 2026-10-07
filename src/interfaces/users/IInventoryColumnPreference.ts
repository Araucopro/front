export const inventoryColumnStoreFilters = ["all", "propias", "consignadas"] as const

export type InventoryColumnStoreFilter = (typeof inventoryColumnStoreFilters)[number]

export type IInventoryColumnPreferenceQuery =
    | { storeID: string; storeFilter?: never }
    | { storeID?: never; storeFilter: InventoryColumnStoreFilter }

export interface IInventoryColumnPreferenceResponse {
    exists: boolean
    hiddenColumns: string[]
    updatedAt: string | null
}

export interface IUpdateInventoryColumnPreference {
    hiddenColumns: string[]
}
