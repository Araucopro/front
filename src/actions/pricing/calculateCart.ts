import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import type { ICalculateCartPayload, ICartPricing } from "@/interfaces/pricing/IPricing"

export function calculateCart(payload: ICalculateCartPayload): Promise<ICartPricing> {
    return fetcher<ICartPricing>(`${API_URL}/pricing/calculate-cart`, {
        method: "POST", body: JSON.stringify(payload),
    })
}
