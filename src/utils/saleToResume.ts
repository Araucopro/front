import { ISaleResponse } from "@/interfaces/sales/ISale"
import { ICountAmountResume, ISalesResume } from "@/interfaces/sales/ISalesResume"
import { getAnulatedProducts } from "@/lib/getAnulatedProducts"
import { getChileDateMeta } from "@/utils/chile-date"

const DAY_MS = 24 * 60 * 60 * 1000

export const normalizeText = (value: unknown): string =>
    String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()

export const isCountableSaleStatus = (status: unknown): boolean => {
    const normalizedStatus = normalizeText(status)
    return ["pagado", "anulado", "emitida", "convertida"].includes(normalizedStatus)
}

export const isCashPayment = (paymentType: unknown): boolean => normalizeText(paymentType) === "efectivo"

export const isDebitOrCreditPayment = (paymentType: unknown): boolean => {
    const normalizedPaymentType = normalizeText(paymentType)
    return (
        normalizedPaymentType.includes("debito") ||
        normalizedPaymentType.includes("credito") ||
        normalizedPaymentType.includes("debit") ||
        normalizedPaymentType.includes("credit") ||
        normalizedPaymentType.includes("webpay") ||
        normalizedPaymentType.includes("transbank")
    )
}

export const getSaleNetAmount = (sale: ISaleResponse): number => {
    const nulledProducts = getAnulatedProducts(sale)
    const totalNulledAmount = nulledProducts.reduce((acc, p) => acc + p.quantitySold * Number(p.unitPrice), 0)
    return sale.total - totalNulledAmount
}

export const salesToResume = (sales: ISaleResponse[], ref: Date): ISalesResume => {
    const resume: ISalesResume = {
        today: {
            total: { count: 0, amount: 0 },
            efectivo: { count: 0, amount: 0 },
            debitoCredito: { count: 0, amount: 0 },
        },
        yesterday: {
            total: { count: 0, amount: 0 },
            efectivo: { count: 0, amount: 0 },
            debitoCredito: { count: 0, amount: 0 },
        },
        last7: {
            total: { count: 0, amount: 0 },
            efectivo: { count: 0, amount: 0 },
            debitoCredito: { count: 0, amount: 0 },
        },
        month: {
            total: { count: 0, amount: 0 },
            efectivo: { count: 0, amount: 0 },
            debitoCredito: { count: 0, amount: 0 },
        },
    }

    const refMeta = getChileDateMeta(ref)
    const yesterdayDayNumber = refMeta.dayNumber - DAY_MS
    const last7StartDayNumber = refMeta.dayNumber - 6 * DAY_MS

    for (const sale of sales) {
        if (!isCountableSaleStatus(sale.status)) continue

        const amount = getSaleNetAmount(sale)

        // Si el monto resultante es 0 o menor, no la contamos (anulación total)
        if (amount <= 0) continue

        const saleDate = new Date(sale.createdAt)
        const saleMeta = getChileDateMeta(saleDate)

        const addSale = (period: keyof ISalesResume) => {
            if (isCashPayment(sale.paymentType)) {
                resume[period].efectivo.count += 1
                resume[period].efectivo.amount += amount
            } else {
                resume[period].debitoCredito.count += 1
                resume[period].debitoCredito.amount += amount
            }
            resume[period].total.count += 1
            resume[period].total.amount += amount
        }

        if (saleMeta.dayNumber === refMeta.dayNumber) addSale("today")
        if (saleMeta.dayNumber === yesterdayDayNumber) addSale("yesterday")
        if (saleMeta.dayNumber >= last7StartDayNumber && saleMeta.dayNumber <= refMeta.dayNumber) addSale("last7")
        if (saleMeta.year === refMeta.year && saleMeta.month === refMeta.month) addSale("month")
    }

    return resume
}

export const salesToBankDepositSummary = (sales: ISaleResponse[], ref: Date): ICountAmountResume => {
    const summary: ICountAmountResume = { count: 0, amount: 0 }
    const refMeta = getChileDateMeta(ref)
    const dayOfWeek = new Date(refMeta.dayNumber).getUTCDay()
    // En un día hábil, el depósito corresponde a las ventas con tarjeta del día anterior.
    let startDayNumber = refMeta.dayNumber - DAY_MS
    let endDayNumber = refMeta.dayNumber - DAY_MS

    if (dayOfWeek === 1) {
        // El lunes se muestra lo que se deposita (jueves) más lo pendiente
        // del viernes y del fin de semana.
        startDayNumber = refMeta.dayNumber - 4 * DAY_MS
        endDayNumber = refMeta.dayNumber - DAY_MS
    } else if (dayOfWeek === 6) {
        // Durante el fin de semana se mantienen visibles las ventas pendientes.
        startDayNumber = refMeta.dayNumber - DAY_MS
        endDayNumber = refMeta.dayNumber
    } else if (dayOfWeek === 0) {
        startDayNumber = refMeta.dayNumber - 2 * DAY_MS
        endDayNumber = refMeta.dayNumber
    }

    for (const sale of sales) {
        if (!isCountableSaleStatus(sale.status) || !isDebitOrCreditPayment(sale.paymentType)) continue

        const saleMeta = getChileDateMeta(new Date(sale.createdAt))
        if (saleMeta.dayNumber < startDayNumber || saleMeta.dayNumber > endDayNumber) continue

        const amount = getSaleNetAmount(sale)
        if (amount <= 0) continue

        summary.count += 1
        summary.amount += amount
    }

    return summary
}
