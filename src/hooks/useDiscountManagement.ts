"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/stores/user.store"
import { getClientAuthToken } from "@/lib/auth-session"

/** UI visibility only. The API validates the signed tenant session and role. */
export function useDiscountManagement() {
    const user = useAuth((state) => state.user)
    const token = useAuth((state) => state.token)
    const [session, setSession] = useState<"tenant" | "master" | null>(null)
    useEffect(() => {
        try {
            const sessionToken = getClientAuthToken() ?? token
            const encoded = sessionToken?.split(".")[1]
            const payload = encoded ? JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))) as { type?: string; impersonatingTenantId?: string } : null
            setSession(payload?.type === "tenant" ? "tenant" : payload?.type === "master" && payload.impersonatingTenantId ? "master" : null)
        } catch { setSession(null) }
    }, [token])
    return session === "master" || (session === "tenant" && user?.role === "admin")
}
