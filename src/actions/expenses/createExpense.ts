import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import { normalizeExpense } from "@/lib/normalize-expense"
import { ICreateExpense, IExpense } from "@/interfaces/expenses/IExpense"

/**
 * Registra un nuevo gasto.
 * POST /expenses
 */
export const createExpense = async (data: ICreateExpense): Promise<IExpense> => {
    const expense = await fetcher<unknown>(`${API_URL}/expenses`, {
        method: "POST",
        body: JSON.stringify(data),
    })
    const normalized = normalizeExpense(expense)
    if (!normalized) throw new Error("No se pudo registrar el gasto")
    return normalized
}
