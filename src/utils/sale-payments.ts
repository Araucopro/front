import type { ISalePayment, ISaleResponse } from "@/interfaces/sales/ISale"

export const hasSplitSalePayment = (sale: Pick<ISaleResponse, "payments">): boolean =>
    sale.payments.length > 1

export const getCompletedSalePayments = (sale: Pick<ISaleResponse, "payments">): ISalePayment[] =>
    sale.payments.filter((payment) => payment.status === "COMPLETED")

export const getSalePaymentLabel = (
    sale: Pick<ISaleResponse, "payments" | "paymentType">,
    fallback = "Sin dato",
): string => {
    const names = sale.payments
        .map((payment) => payment.paymentMethod?.name || payment.paymentMethod?.code)
        .filter((name): name is string => Boolean(name))

    const uniqueNames = [...new Set(names)]
    if (uniqueNames.length > 0) return uniqueNames.join(" + ")
    return sale.paymentType?.trim() || fallback
}

export const getSalePaymentBreakdown = (
    sale: Pick<ISaleResponse, "payments" | "paymentType" | "total">,
): Array<{ label: string; amount: number }> => {
    if (sale.payments.length > 0) {
        return sale.payments.map((payment) => ({
            label: payment.paymentMethod?.name || payment.paymentMethod?.code || "Medio de pago",
            amount: payment.amount,
        }))
    }

    return [{ label: sale.paymentType?.trim() || "Sin dato", amount: sale.total }]
}
