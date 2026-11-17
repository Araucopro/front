import type { DiscountType } from "@/interfaces/pricing/IPricing"
import { toPrice } from "./priceFormat"

/**
 * Etiquetas de visualización para ofertas activas del ERP.
 * Solo presentación: el backend decide qué oferta está vigente y el precio final.
 * Mismo criterio que el ecommerce (PR #12): se priorizan 2x1 y Combo.
 */
export type OfferLabelSource = {
    discountType?: DiscountType | string | null
    value?: number | null
    buyQuantity?: number | null
    payQuantity?: number | null
    description?: string | null
} | null | undefined

/** Etiqueta corta de la oferta: "2x1", "Combo", "20%" o el monto. */
export function getOfferShortLabel(offer: OfferLabelSource): string | null {
    if (!offer) return null
    if (offer.discountType === "BUY_X_GET_Y") return "2x1"
    if (offer.discountType === "BUNDLE") return "Combo"
    if (offer.discountType === "PERCENTAGE") return `${offer.value ?? 0}%`
    if (offer.discountType === "FIXED_AMOUNT") return `$${toPrice(offer.value ?? 0)}`
    if (offer.discountType === "FIXED_PRICE") return "Precio fijo"
    return offer.description?.trim() ? offer.description.trim() : null
}

/**
 * Mensaje para un 2x1 (BUY_X_GET_Y) con las cantidades del ERP, cuando vienen.
 * Ej. buyQuantity 2 / payQuantity 1 -> "Agrega 1 producto más y llévate 2 por 1".
 * Sin cantidades no se inventa el mensaje: se devuelve null y la UI muestra
 * solo la etiqueta y la descripción de la oferta.
 */
export function getBuyXGetYHint(offer: OfferLabelSource): string | null {
    if (!offer || offer.discountType !== "BUY_X_GET_Y") return null
    const buy = Number(offer.buyQuantity)
    const pay = Number(offer.payQuantity)
    if (!Number.isFinite(buy) || !Number.isFinite(pay) || buy <= pay || buy <= 0) return null
    const missing = buy - pay
    return `Agrega ${missing} producto${missing === 1 ? "" : "s"} más y llévate ${buy} por ${pay}`
}
