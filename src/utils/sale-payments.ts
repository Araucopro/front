import type { ISalePayment, ISaleResponse } from "@/interfaces/sales/ISale"

export const hasSplitSalePayment = (sale: Pick<ISaleResponse, "payments">): boolean =>
    sale.payments.length > 1

export const getCompletedSalePayments = (sale: Pick<ISaleResponse, "payments">): ISalePayment[] =>
    sale.payments.filter((payment) => payment.status === "COMPLETED")

export const getSalePaymentLabel = (
    sale: Pick<ISaleResponse, "payments" | "paymentType" | "commerce">,
    fallback = "Sin dato",
): string => {
    const names = sale.payments
        .map((payment) => payment.paymentMethod?.name || payment.paymentMethod?.code)
        .filter((name): name is string => Boolean(name))

    const uniqueNames = [...new Set(names)]
    const provider = sale.commerce?.paymentProvider
    const providerLabel = provider === "mercadopago" ? "Mercado Pago" : provider
    const paymentLabel = uniqueNames.join(" + ") || sale.paymentType?.trim() || providerLabel || fallback
    return sale.commerce?.origin === "WEB" ? `Venta web · ${paymentLabel}` : paymentLabel
}

export const getSalePaymentBreakdown = (
    sale: Pick<ISaleResponse, "payments" | "paymentType" | "total" | "commerce">,
): Array<{ label: string; amount: number }> => {
    if (sale.payments.length > 0) {
        return sale.payments.map((payment) => ({
            label: payment.paymentMethod?.name || payment.paymentMethod?.code || "Medio de pago",
            amount: payment.amount,
        }))
    }

    return [{ label: getSalePaymentLabel(sale), amount: sale.total }]
}
