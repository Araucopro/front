export const TENANT_STATUSES = ["PROVISIONING", "ACTIVE", "SUSPENDED", "ARCHIVED"] as const

export type TenantStatus = (typeof TENANT_STATUSES)[number]

export interface ITenant {
    tenantID: string
    name: string
    slug: string
    status: TenantStatus
    maxStores: number
    maxUsers: number
    planType: string
    subscriptionExpiresAt: string | null
    autoRenew: boolean
    timeZone: string
    locale: string
    createdAt: string
    updatedAt: string
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
