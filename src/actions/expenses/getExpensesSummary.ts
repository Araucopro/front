import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import { IExpenseSummary } from "@/interfaces/expenses/IExpenseSummary"

/**
 * Resumen de gastos del año en curso: serie mensual y totales por tipo.
 * GET /expenses/summary?storeId=
 */
export const getExpensesSummary = async (storeId?: string): Promise<IExpenseSummary> => {
    const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : ""
    return await fetcher<IExpenseSummary>(`${API_URL}/expenses/summary${query}`)
}
