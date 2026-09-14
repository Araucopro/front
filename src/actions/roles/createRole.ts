import { ITenantRole } from "@/interfaces/roles/IRole"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"

export const createRole = async (name: string): Promise<ITenantRole> => {
    return fetcher<ITenantRole>(`${API_URL}/roles`, {
        method: "POST",
        body: JSON.stringify({ name }),
    })
}
