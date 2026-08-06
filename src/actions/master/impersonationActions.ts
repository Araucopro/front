"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getAllStores } from "@/actions/stores/getAllStores"
import { getAllUsers } from "@/actions/users/getAllUsers"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import type { IStore } from "@/interfaces/stores/IStore"
import type { IUser } from "@/interfaces/users/IUser"
import {
    AUTH_COOKIE_MAX_AGE,
    AUTH_COOKIE_NAME,
    AUTH_SESSION_COOKIE_NAME,
    AUTH_SESSION_TYPES,
    MASTER_AUTH_COOKIE_NAME,
    MASTER_IMPERSONATION_COOKIE_NAME,
    MASTER_PENDING_IMPERSONATION_COOKIE_NAME,
} from "@/lib/auth-session"

export interface MasterImpersonationInfo {
    tenantID: string
    tenantName: string
    reason: string
}

export interface MasterImpersonationBootstrap {
    info: MasterImpersonationInfo
    stores: IStore[]
    users: IUser[]
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
): Promise<MasterImpersonationBootstrap> {
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

    const impersonationHeaders = {
        Authorization: `Bearer ${impersonationToken}`,
    }
    const [stores, users] = await Promise.all([
        getAllStores({ headers: impersonationHeaders }),
        getAllUsers({ headers: impersonationHeaders }),
    ])

    if (!users.some((user) => user.role === "admin")) {
        throw new Error("El tenant no tiene un usuario administrador disponible")
    }
    if (stores.length === 0) {
        throw new Error("El tenant no tiene tiendas disponibles")
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
    cookieStore.set(MASTER_PENDING_IMPERSONATION_COOKIE_NAME, impersonationToken, {
        ...activeCookieOptions,
        httpOnly: true,
    })
    cookieStore.set(MASTER_IMPERSONATION_COOKIE_NAME, JSON.stringify(info), {
        ...activeCookieOptions,
        httpOnly: true,
    })

    return { info, stores, users }
}

export async function completeTenantImpersonation(storeID: string): Promise<never> {
    const normalizedStoreID = storeID.trim()
    if (!normalizedStoreID) {
        throw new Error("No se pudo determinar la tienda inicial del tenant")
    }

    const cookieStore = await cookies()
    const sessionType = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value
    const masterToken = cookieStore.get(MASTER_AUTH_COOKIE_NAME)?.value
    const impersonationToken = cookieStore.get(MASTER_PENDING_IMPERSONATION_COOKIE_NAME)?.value
    const impersonationInfo = cookieStore.get(MASTER_IMPERSONATION_COOKIE_NAME)?.value

    if (sessionType !== AUTH_SESSION_TYPES.MASTER || !masterToken || !impersonationToken || !impersonationInfo) {
        throw new Error("La impersonación no se pudo completar o expiró")
    }

    const stores = await getAllStores({
        headers: { Authorization: `Bearer ${impersonationToken}` },
    })
    if (!stores.some((store) => store.storeID === normalizedStoreID)) {
        throw new Error("La tienda seleccionada no pertenece al tenant impersonado")
    }

    cookieStore.set(AUTH_COOKIE_NAME, impersonationToken, {
        ...activeCookieOptions,
        httpOnly: false,
    })
    cookieStore.set(AUTH_SESSION_COOKIE_NAME, AUTH_SESSION_TYPES.TENANT, {
        ...activeCookieOptions,
        httpOnly: false,
    })
    cookieStore.set(MASTER_PENDING_IMPERSONATION_COOKIE_NAME, "", {
        ...activeCookieOptions,
        maxAge: 0,
        httpOnly: true,
    })

    redirect(`/home?storeID=${encodeURIComponent(normalizedStoreID)}`)
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
    cookieStore.set(MASTER_PENDING_IMPERSONATION_COOKIE_NAME, "", {
        ...activeCookieOptions,
        maxAge: 0,
        httpOnly: true,
    })

    return { ok: true }
}
