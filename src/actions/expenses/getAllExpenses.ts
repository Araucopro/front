import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import { normalizeExpenses } from "@/lib/normalize-expense"
import { IExpense } from "@/interfaces/expenses/IExpense"

/**
 * Obtiene todos los gastos registrados.
 * GET /expenses
 */
export const getAllExpenses = async (): Promise<IExpense[]> => {
    try {
        const expenses = await fetcher<unknown>(`${API_URL}/expenses`)
        return normalizeExpenses(expenses)
    } catch (error) {
        console.warn("getAllExpenses: Error fetching expenses:", error)
        return []
    }
}
