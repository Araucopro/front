import type { ISetOpenfacturaKeyResponse } from "@/interfaces/stores/IStore"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"

export async function setOpenfacturaKey(storeID: string, apiKey: string): Promise<ISetOpenfacturaKeyResponse> {
    return fetcher<ISetOpenfacturaKeyResponse>(`${API_URL}/stores/${storeID}/openfactura-key`, {
        method: "PATCH",
        body: JSON.stringify({ apiKey }),
    })
}
