import AccessSelector from "@/components/Master/AccessSelector"
import { getTenants } from "@/actions/master/tenantActions"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AUTH_COOKIE_NAME, AUTH_SESSION_COOKIE_NAME, AUTH_SESSION_TYPES } from "@/lib/auth-session"

export default async function AccessPage() {
    const cookieStore = await cookies()
    const authToken = cookieStore.get(AUTH_COOKIE_NAME)?.value
    const sessionType = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value

    if (!authToken) redirect("/login")
    if (sessionType !== AUTH_SESSION_TYPES.MASTER) redirect("/home")

    try {
        const tenants = await getTenants({
            limit: 100,
            offset: 0,
            status: "ACTIVE",
        })
        return <AccessSelector initialTenants={tenants} />
    } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudieron cargar los accesos"
        return <AccessSelector initialError={message} />
    }
}
