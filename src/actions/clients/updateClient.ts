import type { IClient, IClientPayload } from "@/interfaces/clients/IClient"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"

export const updateClient = async (id: string, payload: Partial<IClientPayload>): Promise<IClient> => {
    return fetcher<IClient>(`${API_URL}/clients/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    })
}
