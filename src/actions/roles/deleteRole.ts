import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"

export const deleteRole = async (id: string): Promise<void> => {
    await fetcher<void>(`${API_URL}/roles/${id}`, {
        method: "DELETE",
    })
}
