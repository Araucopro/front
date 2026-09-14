import { getPermissions } from "@/actions/roles/getPermissions"
import { getRoles } from "@/actions/roles/getRoles"
import { getUsersPage } from "@/actions/users/getAllUsers"
import ConfigurationUsersClient from "@/components/Configuracion/ConfigurationUsersClient"
import type { IPermissionCatalogItem, ITenantRole } from "@/interfaces/roles/IRole"
import type { IUsersResponse } from "@/interfaces/users/IUser"

export default async function ConfiguracionUsuariosPage() {
    let usersData: IUsersResponse = {
        users: [],
        meta: { page: 1, limit: 10, total: 0 },
    }
    let roles: ITenantRole[] = []
    let permissions: IPermissionCatalogItem[] = []
    let loadError: string | undefined

    try {
        const [usersResponse, rolesResponse, permissionsResponse] = await Promise.all([
            getUsersPage({ limit: 10, offset: 0 }),
            getRoles(),
            getPermissions(),
        ])

        usersData = usersResponse
        roles = rolesResponse
        permissions = permissionsResponse
    } catch (error) {
        loadError = error instanceof Error ? error.message : "No se pudo cargar la configuración de usuarios."
    }

    return (
        <main className="mx-auto flex-1 px-4 py-2 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración</h1>
                <p className="mt-2 text-gray-600 dark:text-slate-300">Administración del sistema.</p>
            </div>

            <ConfigurationUsersClient
                initialUsers={usersData}
                roles={roles}
                permissions={permissions}
                loadError={loadError}
            />
        </main>
    )
}
