import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AUTH_COOKIE_NAME, AUTH_SESSION_COOKIE_NAME, AUTH_SESSION_TYPES } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies()
    const authToken = cookieStore.get(AUTH_COOKIE_NAME)?.value
    const sessionType = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value

    if (!authToken) {
        redirect("/login")
    }

    if (sessionType !== AUTH_SESSION_TYPES.MASTER) {
        redirect("/home")
    }

    return children
}
