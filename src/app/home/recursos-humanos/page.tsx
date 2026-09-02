import { getPermissions } from "@/actions/roles/getPermissions"
import { getRoles } from "@/actions/roles/getRoles"
import RolesManagementClient from "@/components/RecursosHumanos/RolesManagementClient"
import type { IPermissionCatalogItem, ITenantRole } from "@/interfaces/roles/IRole"

export default async function RecursosHumanosPage() {
    let roles: ITenantRole[] = []
    let permissions: IPermissionCatalogItem[] = []
    let loadError: string | undefined

    try {
        const [rolesResponse, permissionsResponse] = await Promise.all([getRoles(), getPermissions()])
        roles = rolesResponse
        permissions = permissionsResponse
    } catch (error) {
        loadError = error instanceof Error ? error.message : "No se pudieron cargar los roles."
    }

    return (
        <div className="mx-auto flex-1 px-4 py-2 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recursos Humanos</h1>
                <p className="mt-2 text-gray-600 dark:text-slate-300">
                    Administra roles personalizados y permisos por tenant.
                </p>
            </div>

            <RolesManagementClient initialRoles={roles} initialPermissions={permissions} loadError={loadError} />
        </div>
    )
}
