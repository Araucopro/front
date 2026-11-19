import type { ExpenseType } from "./IExpense"

/**
 * Resumen de gastos del año en curso.
 * GET /expenses/summary?storeId=
 * El back siempre usa el año actual (no acepta parámetro de año).
 */
export interface IExpenseTypeSummary {
    type: ExpenseType
    total: number
}

export interface IExpenseMonthlySummary {
    month: number
    label: string
    total: number
    byType: IExpenseTypeSummary[]
}

export interface IExpenseSummary {
    year: number
    months: IExpenseMonthlySummary[]
    totals: {
        total: number
        byType: IExpenseTypeSummary[]
    }
}
