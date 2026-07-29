export const AUTH_COOKIE_NAME = "auth_token"
export const AUTH_SESSION_COOKIE_NAME = "auth_session_type"

export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24

export const AUTH_SESSION_TYPES = {
    MASTER: "master",
    TENANT: "tenant",
} as const

export type AuthSessionType = (typeof AUTH_SESSION_TYPES)[keyof typeof AUTH_SESSION_TYPES]

export const getClientAuthToken = (): string | null => {
    if (typeof document === "undefined") return null

    const cookie = document.cookie
        .split("; ")
        .find((entry) => entry.startsWith(`${AUTH_COOKIE_NAME}=`))

    if (!cookie) return null

    return decodeURIComponent(cookie.split("=").slice(1).join("="))
}
