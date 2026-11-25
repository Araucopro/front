import type { ExpenseType } from "@/interfaces/expenses/IExpense"
import { toPrice } from "@/utils/priceFormat"

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
    administrative: "Administración",
    operational: "Operación",
    financial: "Financiero",
}

export const EXPENSE_TYPE_OPTIONS: { value: ExpenseType; label: string }[] = [
    { value: "administrative", label: "Gastos de administración" },
    { value: "operational", label: "Gastos de operación" },
    { value: "financial", label: "Gastos financieros" },
]

export const EXPENSE_TYPE_STYLES: Record<ExpenseType, string> = {
    administrative:
        "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-200",
    operational:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
    financial:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
}

export const formatCLP = (value: number): string => `$${toPrice(value)}`

const chileDateFormatter = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
})

export const formatExpenseDate = (value: string): string => {
    if (!value) return "—"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "—"
    return chileDateFormatter.format(date)
}

export const MONTH_LABELS = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
]

export const getExpenseYear = (deductibleDate: string): number => {
    const date = new Date(deductibleDate)
    return Number.isNaN(date.getTime()) ? 0 : date.getUTCFullYear()
}

export const getExpenseMonth = (deductibleDate: string): number => {
    const date = new Date(deductibleDate)
    return Number.isNaN(date.getTime()) ? 0 : date.getUTCMonth() + 1
}

/** Fecha ISO (yyyy-mm-dd) para inputs type="date". */
export const toDateInputValue = (value: string): string => value.slice(0, 10)

/** IVA chileno, usado solo como ayuda para autocompletar el campo de IVA. */
export const IVA_RATE = 0.19
