import { fetcher } from "@/lib/fetcher"
import { API_URL } from "@/lib/enviroments"
import { IStore } from "@/interfaces/stores/IStore"
import { normalizeStore } from "@/lib/normalize-user-store"

/**
 * Actualiza la información de una tienda.
 *
 * @param id - El ID de la tienda (storeID).
 * @param data - Los datos a actualizar.
 */
export async function updateStore(id: string, data: Partial<IStore>): Promise<IStore> {
    const store = await fetcher<IStore>(`${API_URL}/stores/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    })

    return normalizeStore(store)
}
