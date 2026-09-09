import type { IStore } from "../stores/IStore"
import { UserRole } from "@/lib/userRoles"
import type { IUserStoreRelation } from "@/interfaces/common/IUserStoreRelation"

export type UserStatus = "ACTIVE" | "INACTIVE" | "TERMINATED" | (string & {})

export interface IUser {
    userID: string
    tenantID?: string
    name: string
    email: string
    role: UserRole
    roleID?: string
    status?: UserStatus
    password: string
    userImg: string | null
    phone?: string | null
    sessionVersion?: number
    createdAt: string
    updatedAt: string
    userStores: IUserStoreRelation[]
    Stores?: IStore[]
}

export interface IUsersQuery {
    limit?: number
    offset?: number
    search?: string
    role?: string
    roleID?: string
    status?: UserStatus
}

export interface IUsersResponse {
    users: IUser[]
    meta: {
        page: number
        limit: number
        total: number
    }
}
