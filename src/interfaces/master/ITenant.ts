import type { IStore } from "@/interfaces/stores/IStore"
import type { IUser } from "@/interfaces/users/IUser"
import type { StoreTypeValue } from "@/lib/storeTypes"
import type { UserRole } from "@/lib/userRoles"

export const TENANT_STATUSES = ["PROVISIONING", "ACTIVE", "SUSPENDED", "ARCHIVED"] as const
export const TENANT_PLAN_TYPES = ["BASIC", "STANDARD", "ENTERPRISE", "CUSTOM"] as const

export type TenantStatus = (typeof TENANT_STATUSES)[number]
export type TenantPlanType = (typeof TENANT_PLAN_TYPES)[number]

export interface ITenant {
    tenantID: string
    name: string
    slug: string
    status: TenantStatus
    maxStores: number
    maxUsers: number
    planType: TenantPlanType
    subscriptionExpiresAt: string | null
    autoRenew: boolean
    timeZone: string
    locale: string
    createdAt: string
    updatedAt: string
    users?: IUser[]
    stores?: IStore[]
}

export interface ICreateTenant {
    name: string
    status: TenantStatus
    maxStores: number
    maxUsers: number
    timeZone: string
    locale: string
}

export interface IProvisionTenantUser {
    email: string
    name: string
    role: "admin"
    password: string
}

export interface IProvisionTenantStore {
    location: string
    rut: string
    address: string
    phone: string
    city: string
    email: string
    name: string
    type: "central"
    isCentralStore: true
    giro?: string
    acteco?: string
    cdgSIISucur?: string
    businessName?: string
}

export interface IProvisionTenant {
    user: IProvisionTenantUser
    store: IProvisionTenantStore
}

export interface IProvisionTenantResponse {
    message: string
    tenantID: string
    centralStoreID: string
    adminUserID: string
    status: "ACTIVE"
}

export interface ITenantMetrics {
    tenantID: string
    name: string
    slug: string
    status: TenantStatus
    usage: {
        storesCount: number
        maxStores: number
        storesUsagePct: number
        usersCount: number
        maxUsers: number
        usersUsagePct: number
        warningThresholdReached: boolean
    }
    activity: {
        productsCount: number
    }
    subscription: {
        planType: TenantPlanType
        expiresAt: string | null
        daysRemaining: number | null
        autoRenew: boolean
    }
}

export interface IUpdateTenantSubscription {
    planType: TenantPlanType
    subscriptionExpiresAt?: string
    autoRenew: boolean
}

export interface ICreateTenantUser {
    email: string
    name: string
    role: UserRole
    status?: IUser["status"]
    userImg?: string
    password: string
}

export interface IUpdateTenantUser {
    name?: string
    role?: UserRole
    status?: IUser["status"]
    userImg?: string
    password?: string
}

export interface ICreateTenantStore {
    location: string
    rut: string
    address: string
    phone: string
    city: string
    email: string
    name: string
    type: StoreTypeValue
    isCentralStore?: boolean
    storeImg?: string | null
    giro?: string
    acteco?: string
    cdgSIISucur?: string
    businessName?: string
}

export type IUpdateTenantStore = Partial<ICreateTenantStore>

export interface ITenantExportResponse {
    exportedAt: string
    tenant: ITenant
    data: {
        stores: Array<Record<string, unknown>>
        users: Array<Record<string, unknown>>
        categories: Array<Record<string, unknown>>
        products: Array<Record<string, unknown>>
    }
}

export interface ITenantListParams {
    limit?: number
    offset?: number
    status?: TenantStatus
    search?: string
}

export interface ITenantListResponse {
    items: ITenant[]
    total: number
    limit: number
    offset: number
}
