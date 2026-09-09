import { fetcher } from "@/lib/fetcher"
import { API_URL } from "@/lib/enviroments"
import { IUser } from "@/interfaces/users/IUser"

/**
 * Actualiza un usuario en la base de datos mediante una petición HTTP PATCH.
 *
 * @param id - El ID del usuario (userID).
 * @param data - Los datos a actualizar { name, role, userImg, password }.
 */
export const updateUser = async (
    id: string,
    data: { name?: string; role?: string; roleID?: string; userImg?: string; password?: string },
): Promise<IUser> => {
    return await fetcher<IUser>(`${API_URL}/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    })
}
