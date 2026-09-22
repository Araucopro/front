import { fetcher } from "@/lib/fetcher"
import { API_URL } from "@/lib/enviroments"
import type { IUserStoreRelation } from "@/interfaces/common/IUserStoreRelation"
import type { StoreUserRoleValue } from "@/lib/storeUserRoles"

/**
 * Asigna un usuario a una tienda.
 *
 * @param userID - El ID del usuario.
 * @param storeID - El ID de la tienda.
 */
export async function addUserToStore(userID: string, storeID: string, _legacyRole?: StoreUserRoleValue) {
    return await fetcher<IUserStoreRelation>(`${API_URL}/userstores`, {
        method: "POST",
        body: JSON.stringify({ userID, storeID }),
    })
}
