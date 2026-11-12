"use client"

import { useEffect, useState } from "react"
import { calculateCart } from "@/actions/pricing/calculateCart"
import type { ICartPricing, ICalculateCartPayload } from "@/interfaces/pricing/IPricing"

export function useCartPricing(storeID: string, items: ICalculateCartPayload["items"], revision = 0) {
    const payload = JSON.stringify({ storeID, items: items.filter((item) => item.quantity > 0) })
    const key = `${revision}:${payload}`
    const enabled = !!storeID && items.some((item) => item.quantity > 0)
    const [state, setState] = useState<{ key: string; pricing?: ICartPricing; error?: string }>({ key: "" })
    useEffect(() => {
        if (!enabled) return
        let active = true
        const timer = setTimeout(() => {
            void calculateCart(JSON.parse(payload) as ICalculateCartPayload)
                .then((pricing) => { if (active) setState({ key, pricing }) })
                .catch((error: unknown) => {
                    if (active) setState({ key, error: error instanceof Error ? error.message : "No se pudo calcular el carrito" })
                })
        }, 150)
        return () => { active = false; clearTimeout(timer) }
    }, [enabled, payload, key])
    return {
        pricing: enabled && state.key === key ? state.pricing : undefined,
        loading: enabled && state.key !== key,
        error: enabled && state.key === key ? state.error : undefined,
    }
}
