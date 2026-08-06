import { checkStatus } from "@/actions/auth/authActions"
import { getUserStores } from "@/actions/users/getUserStores"
import HomeDashboard from "../../components/Home/HomeDashboard"
import { buildHomeViewModel } from "../../components/Home/home-view-model"

interface SearchParams {
    searchParams: Promise<{
        storeID: string
        date: string
    }>
}

export default async function HomePage({ searchParams }: SearchParams) {
    const { storeID = "", date = "" } = await searchParams
    let effectiveStoreID = storeID
    if (!effectiveStoreID) {
        const auth = await checkStatus().catch(() => null)
        const userStores = auth?.user?.userID ? await getUserStores(auth.user.userID) : []
        effectiveStoreID = userStores[0]?.storeID ?? ""
    }

    const viewModel = await buildHomeViewModel(effectiveStoreID, date)

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
