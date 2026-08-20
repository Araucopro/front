import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import { DiscountTargetScope, ISpecialOffer } from "@/interfaces/pricing/IPricing"

type GetOffersFilters = {
    storeProductID?: string
    storeID?: string
    targetScope?: DiscountTargetScope
    productID?: string
    categoryID?: string
    brand?: string
    isActive?: boolean
}

/**
 * Obtiene todas las ofertas especiales creadas o filtra por producto de tienda.
 * GET /pricing/offers
 */
export async function getOffers(filters?: string | GetOffersFilters): Promise<ISpecialOffer[]> {
    const normalizedFilters = typeof filters === "string" ? { storeProductID: filters } : (filters ?? {})
    const params = new URLSearchParams()
    if (normalizedFilters.storeProductID) params.append("storeProductID", normalizedFilters.storeProductID)
    if (normalizedFilters.storeID) params.append("storeID", normalizedFilters.storeID)
    if (normalizedFilters.targetScope) params.append("targetScope", normalizedFilters.targetScope)
    if (normalizedFilters.productID) params.append("productID", normalizedFilters.productID)
    if (normalizedFilters.categoryID) params.append("categoryID", normalizedFilters.categoryID)
    if (normalizedFilters.brand) params.append("brand", normalizedFilters.brand)
    if (normalizedFilters.isActive !== undefined) params.append("isActive", String(normalizedFilters.isActive))

    const url = `${API_URL}/pricing/offers${params.toString() ? `?${params.toString()}` : ""}`
    return fetcher<ISpecialOffer[]>(url)
}
