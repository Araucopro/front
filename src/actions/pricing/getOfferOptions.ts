import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import type { IOfferOptions } from "@/interfaces/pricing/IPricing"

export function getOfferOptions(): Promise<IOfferOptions> {
    return fetcher<IOfferOptions>(`${API_URL}/pricing/offer-options`)
}
