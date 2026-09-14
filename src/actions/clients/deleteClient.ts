import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"

export const deleteClient = async (id: string): Promise<void> => {
    await fetcher<void>(`${API_URL}/clients/${id}`, {
        method: "DELETE",
    })
}
