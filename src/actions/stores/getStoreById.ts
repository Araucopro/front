import { fetcher } from "@/lib/fetcher"
import { API_URL } from "@/lib/enviroments"
import { IStore } from "@/interfaces/stores/IStore"
import { normalizeStore } from "@/lib/normalize-user-store"

/**
 * Obtiene una tienda por su ID.
 *
 * @param id - El ID de la tienda (storeID).
 */
export async function getStoreById(id: string): Promise<IStore> {
    const store = await fetcher<IStore>(`${API_URL}/stores/${id}`)
    return normalizeStore(store)
}
