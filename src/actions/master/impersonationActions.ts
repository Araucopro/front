"use server"

import { cookies } from "next/headers"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import {
    AUTH_COOKIE_MAX_AGE,
    AUTH_COOKIE_NAME,
    AUTH_SESSION_COOKIE_NAME,
    AUTH_SESSION_TYPES,
    MASTER_AUTH_COOKIE_NAME,
    MASTER_IMPERSONATION_COOKIE_NAME,
} from "@/lib/auth-session"

export interface MasterImpersonationInfo {
    tenantID: string
    tenantName: string
    reason: string
}

const activeCookieOptions = {
    path: "/",
    sameSite: "lax" as const,
    maxAge: AUTH_COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
}

export async function startTenantImpersonation(
    tenantID: string,
    tenantName: string,
    reason: string,
): Promise<MasterImpersonationInfo> {
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
        throw new Error("Debes indicar el motivo del acceso")
    }

    const cookieStore = await cookies()
    const currentToken = cookieStore.get(AUTH_COOKIE_NAME)?.value
    const sessionType = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value
    const storedMasterToken = cookieStore.get(MASTER_AUTH_COOKIE_NAME)?.value
    const masterToken = storedMasterToken || currentToken

    if (!masterToken || sessionType !== AUTH_SESSION_TYPES.MASTER) {
        throw new Error("La sesión master no es válida o expiró")
    }

    const impersonationToken = await fetcher<string>(
        `${API_URL}/master/tenants/${encodeURIComponent(tenantID)}/impersonate`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${masterToken}`,
            },
            body: JSON.stringify({ reason: trimmedReason }),
        },
    )

    if (!impersonationToken) {
        throw new Error("El backend no devolvió el token de impersonación")
    }

    const info: MasterImpersonationInfo = {
        tenantID,
        tenantName,
        reason: trimmedReason,
    }

    cookieStore.set(MASTER_AUTH_COOKIE_NAME, masterToken, {
        ...activeCookieOptions,
        httpOnly: true,
    })
    cookieStore.set(AUTH_COOKIE_NAME, impersonationToken, {
        ...activeCookieOptions,
        httpOnly: false,
    })
    cookieStore.set(AUTH_SESSION_COOKIE_NAME, AUTH_SESSION_TYPES.TENANT, {
        ...activeCookieOptions,
        httpOnly: false,
    })
    cookieStore.set(MASTER_IMPERSONATION_COOKIE_NAME, JSON.stringify(info), {
        ...activeCookieOptions,
        httpOnly: true,
    })

    return info
}

export async function stopTenantImpersonation(): Promise<{ ok: true }> {
    const cookieStore = await cookies()
    const masterToken = cookieStore.get(MASTER_AUTH_COOKIE_NAME)?.value

    if (!masterToken) {
        throw new Error("No se encontró una sesión master para restaurar")
    }

    cookieStore.set(AUTH_COOKIE_NAME, masterToken, {
        ...activeCookieOptions,
        httpOnly: false,
    })
    cookieStore.set(AUTH_SESSION_COOKIE_NAME, AUTH_SESSION_TYPES.MASTER, {
        ...activeCookieOptions,
        httpOnly: false,
    })
    cookieStore.set(MASTER_IMPERSONATION_COOKIE_NAME, "", {
        ...activeCookieOptions,
        maxAge: 0,
        httpOnly: true,
    })

    return { ok: true }
}
