import { checkStatus } from "@/actions/auth/authActions"
import { getSales } from "@/actions/sales/getSales"
import { getMyStores } from "@/actions/stores/getAllStores"
import { SalesHistoryClient } from "@/components/SalesHistory/SalesHistoryClient"
import type { IStore } from "@/interfaces/stores/IStore"
import { resolveAccessibleStoreID } from "@/lib/store-access"
import { Role } from "@/lib/userRoles"

type SalesHistoryPageProps = {
    searchParams?: Promise<{ storeID?: string | string[] }>
}

const parseParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value)

const getScopedStores = (storeID: string, stores: IStore[]) => {
    if (storeID === "all") return stores
    if (storeID === "propias") return stores.filter((store) => store.isCentralStore === true)
    if (storeID === "consignadas") return stores.filter((store) => store.isCentralStore === false)
    return stores.filter((store) => store.storeID === storeID)
}

export default async function SalesHistoryPage({ searchParams }: SalesHistoryPageProps) {
    const params = await searchParams
    const requestedStoreID = parseParam(params?.storeID)
    const [auth, stores] = await Promise.all([checkStatus().catch(() => null), getMyStores()])
    const storeID = resolveAccessibleStoreID(requestedStoreID, stores, auth?.user?.role === Role.Admin)
    const scopedStores = getScopedStores(storeID, stores)
    let loadError: string | undefined

    const pages = await Promise.all(
        scopedStores.map(async (store) => {
            try {
                return await getSales(store.storeID)
            } catch (error) {
                loadError = error instanceof Error ? error.message : "No se pudo cargar el historial de ventas."
                return []
            }
        }),
    )

    const sales = pages
        .flat()
        .map((sale) => ({
            ...sale,
            Store: stores.find((store) => store.storeID === sale.storeID) ?? sale.Store,
        }))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))

    return (
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4 sm:px-6 lg:px-8">
            <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Ventas</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Historial de ventas</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                    Revisa ventas generales y documentos procesados por el SII.
                </p>
            </div>

            <SalesHistoryClient
                initialSales={sales}
                loadError={loadError}
            />
        </main>
    )
}
