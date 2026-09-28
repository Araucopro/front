import type { ICashSessionSummary } from "@/interfaces/cash-registers/ICashRegister"

type RawPaymentMethodSummary = {
    paymentMethodID?: string
    code?: string
    type?: string
    name?: string
    affectsCash?: boolean
    paymentCount?: number | string
    amount?: number | string
    totalAmount?: number | string
}

type RawTransfersSummary = Partial<ICashSessionSummary["transfers"]> & {
    outCount?: number | string
    outAmount?: number | string
    inCount?: number | string
    inAmount?: number | string
}

type RawCashSessionSummary = Omit<ICashSessionSummary, "payments" | "transfers"> & {
    payments: Omit<ICashSessionSummary["payments"], "byMethod"> & {
        byMethod?: RawPaymentMethodSummary[]
    }
    transfers: RawTransfersSummary
}

const toNumber = (value: number | string | null | undefined) => {
    const parsed = Number(value ?? 0)
    return Number.isFinite(parsed) ? parsed : 0
}

export const normalizeCashSessionSummary = (raw: RawCashSessionSummary): ICashSessionSummary => ({
    ...raw,
    payments: {
        ...raw.payments,
        paymentCount: toNumber(raw.payments.paymentCount),
        totalAmount: toNumber(raw.payments.totalAmount),
        cashAmount: toNumber(raw.payments.cashAmount),
        nonCashAmount: toNumber(raw.payments.nonCashAmount),
        byMethod: (raw.payments.byMethod ?? []).map((method) => ({
            paymentMethodID: method.paymentMethodID,
            code: method.code ?? method.type ?? "",
            name: method.name ?? method.code ?? "Medio de pago",
            type: method.type ?? method.code ?? "",
            affectsCash: method.affectsCash,
            totalAmount: toNumber(method.totalAmount ?? method.amount),
            paymentCount: toNumber(method.paymentCount),
        })),
    },
    transfers: {
        sentCount: toNumber(raw.transfers.sentCount ?? raw.transfers.outCount),
        sentAmount: toNumber(raw.transfers.sentAmount ?? raw.transfers.outAmount),
        receivedCount: toNumber(raw.transfers.receivedCount ?? raw.transfers.inCount),
        receivedAmount: toNumber(raw.transfers.receivedAmount ?? raw.transfers.inAmount),
        pendingCount: toNumber(raw.transfers.pendingCount),
        pendingAmount: toNumber(raw.transfers.pendingAmount),
    },
})
