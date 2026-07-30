"use server"

import { cookies } from "next/headers"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import {
    AUTH_COOKIE_NAME,
    AUTH_SESSION_COOKIE_NAME,
    AUTH_SESSION_TYPES,
} from "@/lib/auth-session"
import type {
    ICreateTenant,
    IProvisionTenant,
    IProvisionTenantResponse,
    ITenant,
    ITenantListParams,
    ITenantListResponse,
} from "@/interfaces/master/ITenant"

async function assertMasterSession() {
    const cookieStore = await cookies()
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value
    const sessionType = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value

    if (!token || sessionType !== AUTH_SESSION_TYPES.MASTER) {
        throw new Error("La sesión master no es válida o expiró")
    }
}

export async function getTenants(params: ITenantListParams = {}): Promise<ITenantListResponse> {
    await assertMasterSession()

    const searchParams = new URLSearchParams({
        limit: String(params.limit ?? 10),
        offset: String(params.offset ?? 0),
    })

    if (params.status) searchParams.set("status", params.status)
    if (params.search?.trim()) searchParams.set("search", params.search.trim())

    return fetcher<ITenantListResponse>(`${API_URL}/master/tenants?${searchParams.toString()}`)
}

export async function createTenant(payload: ICreateTenant): Promise<ITenant> {
    await assertMasterSession()

    return fetcher<ITenant>(`${API_URL}/master/tenants`, {
        method: "POST",
        body: JSON.stringify(payload),
    })
}

export async function provisionTenant(
    tenantID: string,
    payload: IProvisionTenant,
): Promise<IProvisionTenantResponse> {
    await assertMasterSession()

    return fetcher<IProvisionTenantResponse>(
        `${API_URL}/master/tenants/${encodeURIComponent(tenantID)}/provision`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    )
}
