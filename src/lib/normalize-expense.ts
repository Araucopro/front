import { IExpense } from "@/interfaces/expenses/IExpense"
import { pickFirst, toNumber, toStringValue } from "./normalize-helpers"

/**
 * Respuesta cruda del back (esquema `Expense` de Scalar):
 * `id` como identificador, montos como número y la tienda como
 * objeto `store` anidado. Se tolera también la forma plana
 * (`expenseID` / `storeID`) por compatibilidad.
 */
type RawExpenseStore = {
    storeID?: string
    name?: string
} | null

type RawExpense = {
    id?: string
    expenseID?: string
    name?: string
    deductibleDate?: string
    amount?: number | string
    netAmount?: number | string
    taxAmount?: number | string
    acceptedForTax?: boolean
    taxCredit?: boolean
    supportDocument?: string | null
    type?: IExpense["type"]
    storeID?: string
    store?: RawExpenseStore
    createdAt?: string
    updatedAt?: string
}

export const normalizeExpense = (raw: unknown): IExpense | null => {
    if (!raw || typeof raw !== "object") return null

    const expense = raw as RawExpense
    const store = expense.store ?? null
    const storeID = pickFirst(expense.storeID, store?.storeID) ?? ""
    const netAmount = toNumber(expense.netAmount)
    const taxAmount = toNumber(expense.taxAmount)
    const amount = toNumber(expense.amount) || netAmount + taxAmount

    return {
        expenseID: pickFirst(expense.expenseID, expense.id) ?? "",
        name: toStringValue(expense.name),
        deductibleDate: toStringValue(expense.deductibleDate),
        amount,
        netAmount,
        taxAmount,
        acceptedForTax: expense.acceptedForTax ?? true,
        taxCredit: expense.taxCredit ?? true,
        supportDocument: expense.supportDocument ?? null,
        type: expense.type ?? "administrative",
        storeID,
        storeName: store?.name,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
    }
}

export const normalizeExpenses = (raw: unknown): IExpense[] => {
    if (!Array.isArray(raw)) return []
    return raw
        .map((item) => normalizeExpense(item))
        .filter((item): item is IExpense => item !== null && item.expenseID !== "")
}
