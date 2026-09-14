import { ITenantRole } from "@/interfaces/roles/IRole"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"

export const updateRole = async (id: string, name: string): Promise<ITenantRole> => {
    return fetcher<ITenantRole>(`${API_URL}/roles/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
    })
}
