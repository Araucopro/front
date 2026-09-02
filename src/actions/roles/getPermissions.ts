import { IPermissionCatalogItem } from "@/interfaces/roles/IRole"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"

export const getPermissions = async (options?: RequestInit): Promise<IPermissionCatalogItem[]> => {
    const permissions = await fetcher<IPermissionCatalogItem[]>(`${API_URL}/roles/permissions`, options)
    return Array.isArray(permissions) ? permissions : []
}
