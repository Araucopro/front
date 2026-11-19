import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import { normalizeExpense } from "@/lib/normalize-expense"
import { IExpense, IUpdateExpense } from "@/interfaces/expenses/IExpense"

/**
 * Actualiza la información de un gasto por su ID.
 * PATCH /expenses/:id
 */
export const updateExpense = async (id: string, data: IUpdateExpense): Promise<IExpense> => {
    const expense = await fetcher<unknown>(`${API_URL}/expenses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    })
    const normalized = normalizeExpense(expense)
    if (!normalized) throw new Error("No se pudo actualizar el gasto")
    return normalized
}
