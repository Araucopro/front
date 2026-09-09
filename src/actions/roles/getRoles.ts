import { ITenantRole } from "@/interfaces/roles/IRole"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"

export const getRoles = async (options?: RequestInit): Promise<ITenantRole[]> => {
    const roles = await fetcher<ITenantRole[]>(`${API_URL}/roles`, options)
    return Array.isArray(roles) ? roles : []
}
