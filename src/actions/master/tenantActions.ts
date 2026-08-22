"use server"

import { cookies } from "next/headers"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import { normalizeStore, normalizeUser } from "@/lib/normalize-user-store"
import {
    AUTH_COOKIE_NAME,
    AUTH_SESSION_COOKIE_NAME,
    AUTH_SESSION_TYPES,
} from "@/lib/auth-session"
import type { IStore } from "@/interfaces/stores/IStore"
import type { IUser } from "@/interfaces/users/IUser"
import type {
    ICreateTenantStore,
    ICreateTenantUser,
    ICreateTenant,
    IProvisionTenant,
    IProvisionTenantResponse,
    ITenant,
    ITenantExportResponse,
    ITenantListParams,
    ITenantListResponse,
    ITenantMetrics,
    IUpdateTenantStore,
    IUpdateTenantSubscription,
    IUpdateTenantUser,
    TenantStatus,
} from "@/interfaces/master/ITenant"

async function assertMasterSession() {
    const cookieStore = await cookies()
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value
    const sessionType = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value

    if (!token || sessionType !== AUTH_SESSION_TYPES.MASTER) {
        throw new Error("La sesión master no es válida o expiró")
    }
}

function normalizeTenant(raw: ITenant): ITenant {
    return {
        ...raw,
        ...(Array.isArray(raw.users) ? { users: raw.users.map(normalizeUser) } : {}),
        ...(Array.isArray(raw.stores) ? { stores: raw.stores.map(normalizeStore) } : {}),
    }
}

function tenantPath(tenantId: string) {
    return `${API_URL}/master/tenants/${encodeURIComponent(tenantId)}`
}

export async function getTenants(params: ITenantListParams = {}): Promise<ITenantListResponse> {
    await assertMasterSession()

    const searchParams = new URLSearchParams({
        limit: String(params.limit ?? 10),
        offset: String(params.offset ?? 0),
    })

    if (params.status) searchParams.set("status", params.status)
    if (params.search?.trim()) searchParams.set("search", params.search.trim())

    const response = await fetcher<ITenantListResponse>(`${API_URL}/master/tenants?${searchParams.toString()}`)

    return {
        ...response,
        items: Array.isArray(response.items) ? response.items.map(normalizeTenant) : [],
    }
}

export async function createTenant(payload: ICreateTenant): Promise<ITenant> {
    await assertMasterSession()

    const tenant = await fetcher<ITenant>(`${API_URL}/master/tenants`, {
        method: "POST",
        body: JSON.stringify(payload),
    })

    return normalizeTenant(tenant)
}

export async function provisionTenant(
    tenantId: string,
    payload: IProvisionTenant,
): Promise<IProvisionTenantResponse> {
    await assertMasterSession()

    return fetcher<IProvisionTenantResponse>(
        `${tenantPath(tenantId)}/provision`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    )
}

export async function getTenant(tenantId: string): Promise<ITenant> {
    await assertMasterSession()

    const tenant = await fetcher<ITenant>(tenantPath(tenantId))

    return normalizeTenant(tenant)
}

export async function createTenantUser(tenantId: string, payload: ICreateTenantUser): Promise<IUser> {
    await assertMasterSession()

    const user = await fetcher<IUser>(`${tenantPath(tenantId)}/users`, {
        method: "POST",
        body: JSON.stringify(payload),
    })

    return normalizeUser(user)
}

export async function updateTenantUser(
    tenantId: string,
    userId: string,
    payload: IUpdateTenantUser,
): Promise<IUser> {
    await assertMasterSession()

    const user = await fetcher<IUser>(
        `${tenantPath(tenantId)}/users/${encodeURIComponent(userId)}`,
        {
            method: "PATCH",
            body: JSON.stringify(payload),
        },
    )

    return normalizeUser(user)
}

export async function createTenantStore(tenantId: string, payload: ICreateTenantStore): Promise<IStore> {
    await assertMasterSession()

    const store = await fetcher<IStore>(`${tenantPath(tenantId)}/stores`, {
        method: "POST",
        body: JSON.stringify(payload),
    })

    return normalizeStore(store)
}

export async function updateTenantStore(
    tenantId: string,
    storeId: string,
    payload: IUpdateTenantStore,
): Promise<IStore> {
    await assertMasterSession()

    const store = await fetcher<IStore>(
        `${tenantPath(tenantId)}/stores/${encodeURIComponent(storeId)}`,
        {
            method: "PATCH",
            body: JSON.stringify(payload),
        },
    )

    return normalizeStore(store)
}

export async function getTenantMetrics(tenantId: string): Promise<ITenantMetrics> {
    await assertMasterSession()

    return fetcher<ITenantMetrics>(`${tenantPath(tenantId)}/metrics`)
}

export async function updateTenantSubscription(
    tenantId: string,
    payload: IUpdateTenantSubscription,
): Promise<ITenant> {
    await assertMasterSession()

    const tenant = await fetcher<ITenant>(`${tenantPath(tenantId)}/subscription`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    })

    return normalizeTenant(tenant)
}

export async function exportTenantData(tenantId: string): Promise<ITenantExportResponse> {
    await assertMasterSession()

    return fetcher<ITenantExportResponse>(`${tenantPath(tenantId)}/export`)
}

export async function updateTenantStatus(
    tenantId: string,
    status: TenantStatus,
): Promise<ITenant> {
    await assertMasterSession()

    const tenant = await fetcher<ITenant>(`${tenantPath(tenantId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    })

    return normalizeTenant(tenant)
}
