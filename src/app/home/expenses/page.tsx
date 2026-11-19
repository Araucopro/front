import { getAllExpenses } from "@/actions/expenses/getAllExpenses"
import { getExpensesSummary } from "@/actions/expenses/getExpensesSummary"
import { getMyStores } from "@/actions/stores/getAllStores"
import ExpensesClient from "@/components/Expenses/ExpensesClient"
import type { IExpense } from "@/interfaces/expenses/IExpense"
import type { IExpenseSummary } from "@/interfaces/expenses/IExpenseSummary"
import type { IStore } from "@/interfaces/stores/IStore"
import { resolveAccessibleStoreID } from "@/lib/store-access"

type ExpensesPageProps = {
    searchParams?: Promise<{ storeID?: string | string[] }>
}

const parseParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value)

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
    const resolvedSearchParams = await searchParams
    const requestedStoreID = parseParam(resolvedSearchParams?.storeID)

    const [expensesResult, summaryResult, storesResult] = await Promise.allSettled([
        getAllExpenses(),
        getExpensesSummary(),
        getMyStores(),
    ])

    const expenses: IExpense[] = expensesResult.status === "fulfilled" ? expensesResult.value : []
    const summary: IExpenseSummary | null = summaryResult.status === "fulfilled" ? summaryResult.value : null
    const stores: IStore[] = storesResult.status === "fulfilled" ? storesResult.value : []

    const failedParts: string[] = []
    if (expensesResult.status === "rejected") failedParts.push("los gastos")
    if (summaryResult.status === "rejected") failedParts.push("el resumen del año")
    if (storesResult.status === "rejected") failedParts.push("las tiendas")
    const loadError =
        failedParts.length > 0 ? `No se pudo cargar ${failedParts.join(", ")}. Intenta recargar la página.` : undefined

    const storeID = resolveAccessibleStoreID(requestedStoreID, stores)

    return (
        <div className="mx-auto flex-1 px-4 py-2 sm:px-6 lg:px-8">
            <ExpensesClient
                initialExpenses={expenses}
                initialSummary={summary}
                stores={stores}
                initialStoreId={storeID}
                loadError={loadError}
            />
        </div>
    )
}
