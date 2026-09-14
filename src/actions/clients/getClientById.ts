import type { IClient } from "@/interfaces/clients/IClient"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"

export const getClientById = async (id: string): Promise<IClient> => {
    return fetcher<IClient>(`${API_URL}/clients/${id}`)
}
