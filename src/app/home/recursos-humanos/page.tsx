import { getRoles } from "@/actions/roles/getRoles"
import { getAllStores } from "@/actions/stores/getAllStores"
import { getUsersPage } from "@/actions/users/getAllUsers"
import HumanResourcesOverview from "@/components/RecursosHumanos/HumanResourcesOverview"
import HumanResourcesWorkers from "@/components/RecursosHumanos/HumanResourcesWorkers"
import type { ITenantRole } from "@/interfaces/roles/IRole"
import type { IStore } from "@/interfaces/stores/IStore"
import type { IUsersResponse } from "@/interfaces/users/IUser"

export default async function RecursosHumanosPage() {
    let usersData: IUsersResponse = {
        users: [],
        meta: { page: 1, limit: 10, total: 0 },
    }
    let roles: ITenantRole[] = []
    let stores: IStore[] = []
    let loadError: string | undefined

    try {
        const [usersResponse, rolesResponse, storesResponse] = await Promise.all([
            getUsersPage({ limit: 10, offset: 0 }),
            getRoles(),
            getAllStores(),
        ])
        usersData = usersResponse
        roles = rolesResponse
        stores = storesResponse
    } catch (error) {
        loadError = error instanceof Error ? error.message : "No se pudieron cargar los trabajadores."
    }

    return (
        <div className="mx-auto flex-1 px-4 py-2 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recursos Humanos</h1>
                <p className="mt-2 text-gray-600 dark:text-slate-300">Gestion de personas y equipo.</p>
            </div>

            <div className="mb-6">
                <HumanResourcesOverview />
            </div>

            <HumanResourcesWorkers initialData={usersData} roles={roles} stores={stores} loadError={loadError} />
        </div>
    )
}
