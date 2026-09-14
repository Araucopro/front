import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import { IUser, IUsersQuery, IUsersResponse } from "@/interfaces/users/IUser"
import { normalizeUser } from "@/lib/normalize-user-store"

/**
 * Obtiene todos los usuarios desde la API.
 * Realiza una petición GET a la ruta `/users` y devuelve los datos como un arreglo de productos.
 *
 * @returns {Promise<IUser[]>} - Promesa que resuelve con un array de objetos `IUser`.
 * 😊
 * @example
 * const users = await getAllusers();
 */

type UsersApiResponse = IUser[] | IUsersResponse

const buildUsersUrl = (query: IUsersQuery = {}) => {
    const params = new URLSearchParams()

    if (query.limit) params.set("limit", query.limit.toString())
    if (query.offset !== undefined) params.set("offset", query.offset.toString())
    if (query.search?.trim()) params.set("search", query.search.trim())
    if (query.role) params.set("role", query.role)
    if (query.roleID) params.set("roleID", query.roleID)
    if (query.status) params.set("status", query.status)

    const searchParams = params.toString()
    return searchParams ? `${API_URL}/users?${searchParams}` : `${API_URL}/users`
}

export const getUsersPage = async (query: IUsersQuery = {}, options?: RequestInit): Promise<IUsersResponse> => {
    const response = await fetcher<UsersApiResponse>(buildUsersUrl(query), options)

    if (Array.isArray(response)) {
        const users = response.map(normalizeUser)
        return {
            users,
            meta: {
                page: 1,
                limit: query.limit ?? users.length,
                total: users.length,
            },
        }
    }

    const users = Array.isArray(response.users) ? response.users.map(normalizeUser) : []

    return {
        users,
        meta: response.meta ?? {
            page: query.offset && query.limit ? Math.floor(query.offset / query.limit) + 1 : 1,
            limit: query.limit ?? 50,
            total: users.length,
        },
    }
}

export const getAllUsers = async (options?: RequestInit): Promise<IUser[]> => {
    const limit = 100
    const firstPage = await getUsersPage({ limit, offset: 0 }, options)
    const users = [...firstPage.users]

    while (users.length < firstPage.meta.total) {
        const response = await getUsersPage({ limit, offset: users.length }, options)
        if (response.users.length === 0) break
        users.push(...response.users)
    }

    return users
}
