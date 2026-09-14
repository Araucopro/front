import type { IClient, IClientPayload } from "@/interfaces/clients/IClient"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"

export const createClient = async (payload: IClientPayload): Promise<IClient> => {
    return fetcher<IClient>(`${API_URL}/clients`, {
        method: "POST",
        body: JSON.stringify(payload),
    })
}
