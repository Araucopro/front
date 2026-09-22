import { fetcher } from "@/lib/fetcher"
import { API_URL } from "@/lib/enviroments"
import type { ICreateUser, IUser } from "@/interfaces/users/IUser"

/**
 * Crea un nuevo usuario en el sistema.
 *
 * @param data - Los datos del nuevo usuario.
 */
export const createUser = async (data: ICreateUser): Promise<IUser> => {
    return await fetcher<IUser>(`${API_URL}/users`, {
        method: "POST",
        body: JSON.stringify(data),
    })
}
