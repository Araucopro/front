import { IStore } from "@/interfaces/stores/IStore"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import { normalizeStore } from "@/lib/normalize-user-store"

type MyStoreEntry =
    | IStore
    | {
          store?: IStore | null
          Store?: IStore | null
      }

/**
 * Obtiene todas las tiendas desde la API.
 *
 * @returns {Promise<IStore[]>} - Promesa que resuelve con un array de objetos `IStore`.
 */
export const getAllStores = async (options?: RequestInit): Promise<IStore[]> => {
    const stores = await fetcher<IStore[]>(`${API_URL}/stores`, options)
    return Array.isArray(stores) ? stores.map(normalizeStore) : []
}

/**
 * Obtiene únicamente las tiendas accesibles para el usuario autenticado.
 * El backend devuelve todas las tiendas del tenant cuando el usuario es admin.
 */
export const getMyStores = async (options?: RequestInit): Promise<IStore[]> => {
    const entries = await fetcher<MyStoreEntry[]>(`${API_URL}/userstores/my-stores`, options)
    if (!Array.isArray(entries)) return []

    const stores = entries.flatMap((entry) => {
        if ("storeID" in entry) return [normalizeStore(entry)]
        const store = entry.store ?? entry.Store
        return store ? [normalizeStore(store)] : []
    })

    return Array.from(new Map(stores.map((store) => [store.storeID, store])).values())
}

/**
 * Obtiene todas las tiendas de un mismo usuario.
 *
 * @returns {Promise<IStore[]>} - Promesa que resuelve con un array de objetos `IStore`.
 */
export const getUserStores = async (userId: string, options?: RequestInit): Promise<IStore[]> => {
    const stores = await fetcher<IStore[]>(`${API_URL}/users/${userId}/stores`, options)
    return Array.isArray(stores) ? stores.map(normalizeStore) : []
}
