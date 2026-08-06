"use server"

import { fetcher } from "@/lib/fetcher"
import { API_URL } from "@/lib/enviroments"
import {
    AUTH_COOKIE_MAX_AGE,
    AUTH_COOKIE_NAME,
    AUTH_SESSION_COOKIE_NAME,
    AUTH_SESSION_TYPES,
    MASTER_AUTH_COOKIE_NAME,
    MASTER_IMPERSONATION_COOKIE_NAME,
    MASTER_PENDING_IMPERSONATION_COOKIE_NAME,
    type AuthSessionType,
} from "@/lib/auth-session"
import { cookies } from "next/headers"
import { normalizeUser } from "@/lib/normalize-user-store"
import type { IUser } from "@/interfaces/users/IUser"
import type { IMasterAuthResponse } from "@/interfaces/auth/IMasterSession"

type AuthResponse = {
    message?: string
    user: IUser
    accessToken: string
}

type RawAuthResponse = {
    message?: string
    user: Parameters<typeof normalizeUser>[0]
    accessToken: string
}

const setSessionCookies = async (accessToken: string, sessionType: AuthSessionType) => {
    const cookieStore = await cookies()
    const cookieOptions = {
        path: "/",
        sameSite: "lax" as const,
        maxAge: AUTH_COOKIE_MAX_AGE,
        secure: process.env.NODE_ENV === "production",
        httpOnly: false,
    }

    cookieStore.set(AUTH_COOKIE_NAME, accessToken, cookieOptions)
    cookieStore.set(AUTH_SESSION_COOKIE_NAME, sessionType, cookieOptions)

    if (sessionType === AUTH_SESSION_TYPES.MASTER) {
        cookieStore.set(MASTER_AUTH_COOKIE_NAME, accessToken, {
            ...cookieOptions,
            httpOnly: true,
        })
    } else {
        cookieStore.set(MASTER_AUTH_COOKIE_NAME, "", { ...cookieOptions, maxAge: 0, httpOnly: true })
    }

    cookieStore.set(MASTER_IMPERSONATION_COOKIE_NAME, "", {
        ...cookieOptions,
        maxAge: 0,
        httpOnly: true,
    })
    cookieStore.set(MASTER_PENDING_IMPERSONATION_COOKIE_NAME, "", {
        ...cookieOptions,
        maxAge: 0,
        httpOnly: true,
    })
}

export async function login(email: string, password: string) {
    const auth = await fetcher<RawAuthResponse>(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    })
    const normalized: AuthResponse = {
        ...auth,
        user: normalizeUser(auth.user),
    }

    await setSessionCookies(normalized.accessToken, AUTH_SESSION_TYPES.TENANT)

    return normalized
}

export async function loginMaster(email: string, password: string) {
    const auth = await fetcher<IMasterAuthResponse>(`${API_URL}/master/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    })

    await setSessionCookies(auth.accessToken, AUTH_SESSION_TYPES.MASTER)

    return auth
}

export async function checkStatus() {
    const auth = await fetcher<RawAuthResponse>(`${API_URL}/auth/check-status`, {
        method: "GET",
    })
    return {
        ...auth,
        user: normalizeUser(auth.user),
    }
}

export async function logout() {
    const cookieStore = await cookies()
    const expiredCookieOptions = {
        path: "/",
        sameSite: "lax",
        maxAge: 0,
        secure: process.env.NODE_ENV === "production",
        httpOnly: false,
    } as const

    cookieStore.set(AUTH_COOKIE_NAME, "", expiredCookieOptions)
    cookieStore.set(AUTH_SESSION_COOKIE_NAME, "", expiredCookieOptions)
    cookieStore.set(MASTER_AUTH_COOKIE_NAME, "", { ...expiredCookieOptions, httpOnly: true })
    cookieStore.set(MASTER_IMPERSONATION_COOKIE_NAME, "", { ...expiredCookieOptions, httpOnly: true })
    cookieStore.set(MASTER_PENDING_IMPERSONATION_COOKIE_NAME, "", { ...expiredCookieOptions, httpOnly: true })

    return { ok: true }
}
