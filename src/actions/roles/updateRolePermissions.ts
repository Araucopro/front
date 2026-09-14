import { IRolePermissionInput, ITenantRole } from "@/interfaces/roles/IRole"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"

export const updateRolePermissions = async (
    id: string,
    permissions: IRolePermissionInput[],
): Promise<ITenantRole> => {
    return fetcher<ITenantRole>(`${API_URL}/roles/${id}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({ permissions }),
    })
}
