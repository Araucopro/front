"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import FriendlyLoadingScreen from "../Animations/FriendlyLoadingScreen"
import { login, loginMaster } from "@/actions/auth/authActions"
import { getUserStores } from "@/actions/users/getUserStores"
import { useAuth } from "@/stores/user.store"
import { toast } from "sonner"
import { useTienda } from "@/stores/tienda.store"
import { Role } from "@/lib/userRoles"
import { useMasterAuth } from "@/stores/master.store"

export default function LoginForm() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setLoading] = useState(false)
    const [loadingMessage, setLoadingMessage] = useState("Verificando tus datos...")
    const router = useRouter()
    const { setUser, logout: clearTenantSession } = useAuth()
    const { setStoreSelected, setStoresUser } = useTienda()
    const { setMasterUser, clearMasterUser } = useMasterAuth()

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()

        if (isLoading) return

        let navigationStarted = false

        try {
            setLoading(true)
            setLoadingMessage("Verificando tus datos...")

            let data: Awaited<ReturnType<typeof login>>

            try {
                data = await login(email, password)
            } catch (tenantLoginError) {
                setLoadingMessage("Verificando acceso master...")

                try {
                    const masterData = await loginMaster(email, password)
                    clearTenantSession()
                    setMasterUser(masterData.masterUser)
                    setLoadingMessage("Preparando panel master...")
                    router.prefetch("/master")
                    navigationStarted = true
                    toast.success("Sesión master iniciada correctamente")
                    router.push("/master")
                    return
                } catch {
                    throw tenantLoginError
                }
            }

            if (!data.user) {
                toast.error("Email o contraseña incorrectos")
                return
            }

            clearMasterUser()
            setUser(data.user, data.accessToken)
            setLoadingMessage("Buscando tus tiendas...")

            const userStores = await getUserStores(data.user.userID)
            setStoresUser(userStores)

            let destination = "/home?storeID=all"

            if (userStores.length > 0) {
                const selectedStore = userStores[0]
                setStoreSelected(selectedStore)

                const storeID = selectedStore.storeID
                destination =
                    data.user.role === Role.Consignado || data.user.role === Role.Tercero
                        ? `/home/purchaseOrder?storeID=${storeID}`
                        : `/home?storeID=${storeID}`

                toast.success("Inicio de sesión exitoso")
            } else {
                toast.success("Inicio de sesión exitoso, verificando tiendas...")
            }

            setLoadingMessage("Preparando tu experiencia...")
            router.prefetch(destination)
            navigationStarted = true
            router.push(destination)
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado al iniciar sesión")
        } finally {
            if (!navigationStarted) {
                setLoading(false)
            }
        }
    }

    return (
        <>
            {isLoading && (
                <FriendlyLoadingScreen
                    overlay
                    title={loadingMessage}
                    detail="Estamos preparando tu espacio de trabajo."
                />
            )}

            <form onSubmit={handleSubmit} className="flex flex-col" aria-busy={isLoading}>
                <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[#202938]" htmlFor="email">
                        Correo electrónico
                    </label>
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="nombre@empresa.com"
                        className="h-[46px] w-full rounded-[10px] border-[#dce0e5] bg-white px-4 text-[13px] text-[#171717] shadow-none transition-colors placeholder:text-[#9ca3af] focus-visible:border-[#174531] focus-visible:ring-2 focus-visible:ring-[#174531]/15 focus-visible:ring-offset-0"
                        autoComplete="email"
                        autoFocus
                        disabled={isLoading}
                        required
                    />
                </div>

                <div className="mt-7">
                    <label className="mb-1.5 block text-xs font-semibold text-[#202938]" htmlFor="password">
                        Contraseña
                    </label>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="••••••••"
                        className="h-[46px] w-full rounded-[10px] border-[#dce0e5] bg-white px-4 text-[13px] text-[#171717] shadow-none transition-colors placeholder:text-[#171717] focus-visible:border-[#174531] focus-visible:ring-2 focus-visible:ring-[#174531]/15 focus-visible:ring-offset-0"
                        autoComplete="current-password"
                        disabled={isLoading}
                        required
                    />
                </div>

                <Button
                    type="submit"
                    disabled={isLoading}
                    className="mt-5 h-[46px] rounded-[10px] bg-[#174531] text-sm font-semibold text-white shadow-none hover:bg-[#123a29] focus-visible:ring-[#174531]"
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Iniciando sesión...
                        </span>
                    ) : (
                        "Entrar al sistema"
                    )}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => toast.info("La recuperación de contraseña estará disponible próximamente")}
                    className="mt-2 h-[44px] rounded-[10px] border-[#dce0e5] bg-white text-[13px] font-semibold text-[#707789] shadow-none hover:bg-[#f6f7f8] hover:text-[#4c5361]"
                >
                    Olvidé mi contraseña
                </Button>
            </form>
        </>
    )
}
