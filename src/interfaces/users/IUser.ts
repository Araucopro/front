import type { IStore } from "../stores/IStore"
import { UserRole } from "@/lib/userRoles"
import type { IUserStoreRelation } from "@/interfaces/common/IUserStoreRelation"

export interface IUser {
    userID: string
    tenantID?: string
    name: string
    email: string
    role: UserRole
    status?: "ACTIVE" | "INACTIVE"
    password: string
    userImg: string | null
    sessionVersion?: number
    createdAt: string
    updatedAt: string
    userStores: IUserStoreRelation[]
    Stores?: IStore[]
}
