import { checkStatus } from "@/actions/auth/authActions"
import { getMyStores } from "@/actions/stores/getAllStores"
import HomeDashboard from "../../components/Home/HomeDashboard"
import { buildHomeViewModel } from "../../components/Home/home-view-model"
import { resolveAccessibleStoreID } from "@/lib/store-access"
import { Role } from "@/lib/userRoles"

interface SearchParams {
    searchParams: Promise<{
        storeID: string
        date: string
    }>
}

export default async function HomePage({ searchParams }: SearchParams) {
    const { storeID = "", date = "" } = await searchParams
    const [auth, stores] = await Promise.all([checkStatus().catch(() => null), getMyStores().catch(() => [])])
    const effectiveStoreID = resolveAccessibleStoreID(storeID, stores, auth?.user?.role === Role.Admin)

    const viewModel = await buildHomeViewModel(effectiveStoreID, date, stores)

    if (!viewModel) {
        return (
            <div className="mx-auto mt-12 max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-amber-950 shadow-sm">
                <h2 className="text-lg font-bold">No hay una tienda disponible</h2>
                <p className="mt-2 text-sm text-amber-800">
                    La sesión está activa, pero no fue posible encontrar información para la tienda seleccionada.
                    Verifica que el tenant tenga una tienda configurada o cambia de acceso desde la franja superior.
                </p>
            </div>
        )
    }

    return (
        <HomeDashboard
            stores={viewModel.stores}
            resume={viewModel.resume}
            allSalesForResume={viewModel.allSalesForResume}
            items={viewModel.items}
            allProducts={viewModel.allProducts}
            dateRef={viewModel.dateRef}
            date={viewModel.date}
        />
    )
}
