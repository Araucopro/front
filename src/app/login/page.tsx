import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AUTH_COOKIE_NAME, AUTH_SESSION_COOKIE_NAME, AUTH_SESSION_TYPES } from "@/lib/auth-session"
import LoginScreen from "@/components/Login/LoginScreen"

export default async function LoginPage() {
    const cookieStore = await cookies()
    const authToken = cookieStore.get(AUTH_COOKIE_NAME)?.value
    const sessionType = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value

    if (authToken) {
        redirect(sessionType === AUTH_SESSION_TYPES.MASTER ? "/access" : "/home")
    }

    return <LoginScreen />
}
