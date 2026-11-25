import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import { normalizeExpense } from "@/lib/normalize-expense"
import { IExpense } from "@/interfaces/expenses/IExpense"

/**
 * Obtiene un gasto por su ID.
 * GET /expenses/:id
 */
export const getExpenseById = async (id: string): Promise<IExpense> => {
    const expense = await fetcher<unknown>(`${API_URL}/expenses/${id}`)
    const normalized = normalizeExpense(expense)
    if (!normalized) throw new Error("No se encontró el gasto")
    return normalized
}
