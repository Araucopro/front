"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, ChevronRight, Loader2, LogOut, Search, ShieldCheck, Zap } from "lucide-react"
import {
    completeTenantImpersonation,
    startTenantImpersonation,
    stopTenantImpersonation,
} from "@/actions/master/impersonationActions"
import { logout as logoutSession } from "@/actions/auth/authActions"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ITenant, ITenantListResponse } from "@/interfaces/master/ITenant"
import { useAuth } from "@/stores/user.store"
import { useMasterAuth } from "@/stores/master.store"
import { useTienda } from "@/stores/tienda.store"
import { toast } from "sonner"

interface AccessSelectorProps {
    initialTenants?: ITenantListResponse
    initialError?: string
}

const DEFAULT_REASON = "Soporte técnico / Auditoría"

function normalizeSearch(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
}

export default function AccessSelector({ initialTenants, initialError }: AccessSelectorProps) {
    const router = useRouter()
    const { masterUser, clearMasterUser } = useMasterAuth()
    const { setUser, setUsers, logout: clearTenantSession } = useAuth()
    const { setStores, setStoresUser, setStoreSelected } = useTienda()
    const [search, setSearch] = useState("")
    const [selectedTenant, setSelectedTenant] = useState<ITenant | null>(null)
    const [reason, setReason] = useState(DEFAULT_REASON)
    const [isEntering, setIsEntering] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    const tenants = initialTenants?.items ?? []
    const filteredTenants = useMemo(() => {
        const query = normalizeSearch(search)
        if (!query) return tenants

        return tenants.filter((tenant) =>
            normalizeSearch(`${tenant.name} ${tenant.slug} ${tenant.planType}`).includes(query),
        )
    }, [search, tenants])

    const handleEnterMaster = () => {
        router.push("/master")
    }

    const handleSelectTenant = (tenant: ITenant) => {
        setSelectedTenant(tenant)
        setReason(DEFAULT_REASON)
    }

    const handleImpersonate = async () => {
        if (!selectedTenant || isEntering) return
        if (!reason.trim()) {
            toast.error("Debes indicar el motivo del acceso")
            return
        }

        let impersonationStarted = false

        try {
            setIsEntering(true)
            const { stores, users } = await startTenantImpersonation(
                selectedTenant.tenantID,
                selectedTenant.name,
                reason,
            )
            impersonationStarted = true

            const tenantAdmin = users.find((user) => user.role === "admin")

            if (!tenantAdmin) {
                throw new Error("El tenant no tiene un usuario administrador disponible")
            }
            if (stores.length === 0) {
                throw new Error("El tenant no tiene tiendas disponibles")
            }

            clearTenantSession()
            setUser(tenantAdmin, "master-impersonation")
            setUsers(users)
            setStores(stores)
            setStoresUser(stores)
            setStoreSelected(stores[0])

            toast.success(`Ahora estás viendo ${selectedTenant.name} como administrador`)
            await completeTenantImpersonation(stores[0].storeID)
        } catch (error) {
            if (impersonationStarted) {
                await stopTenantImpersonation().catch(() => null)
            }
            toast.error(error instanceof Error ? error.message : "No se pudo ingresar al tenant")
        } finally {
            setIsEntering(false)
        }
    }

    const handleLogout = async () => {
        if (isLoggingOut) return

        try {
            setIsLoggingOut(true)
            await logoutSession()
            clearTenantSession()
            clearMasterUser()
            router.replace("/login")
        } finally {
            setIsLoggingOut(false)
        }
    }

    return (
        <main className="min-h-svh bg-[#0d2630] px-4 py-8 text-[#122238] sm:py-12">
            <section className="mx-auto min-h-[calc(100svh-4rem)] w-full max-w-xl rounded-2xl bg-white px-5 py-7 shadow-2xl sm:px-10 sm:py-9">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#143a28]">
                            <Zap className="h-5 w-5 fill-yellow-300 text-yellow-300" />
                        </span>
                        <p className="text-lg font-black">
                            Arauco<span className="text-[#16834e]">Pro</span>
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-[#758296] hover:text-red-600 disabled:opacity-50"
                    >
                        {isLoggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                        Salir
                    </button>
                </header>

                <div className="mt-10">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#16834e]">Selección de acceso</p>
                    <h1 className="mt-2 text-2xl font-black">¿Qué quieres administrar hoy?</h1>
                    <p className="mt-2 text-sm text-[#758296]">
                        {masterUser?.email
                            ? `${masterUser.email}, selecciona el panel de plataforma o uno de los tenants.`
                            : "Selecciona el panel de plataforma o uno de los tenants."}
                    </p>
                </div>

                <button
                    onClick={handleEnterMaster}
                    className="mt-7 flex w-full items-center gap-4 rounded-xl border-2 border-[#dce3e6] bg-white px-4 py-4 text-left transition hover:border-[#16834e] hover:bg-[#f7fbf8]"
                >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#143a28]">
                        <Zap className="h-5 w-5 fill-yellow-300 text-yellow-300" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-extrabold">AraucoPro</span>
                        <span className="mt-1 block text-[11px] text-[#758296]">
                            <strong className="mr-2 rounded-full bg-[#e8ecf0] px-2 py-0.5 text-[9px] text-[#39485b]">
                                Master
                            </strong>
                            Panel de gestión de la plataforma
                        </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#8994a3]" />
                </button>

                <div className="relative mt-5">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8994a3]" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar tenant..."
                        className="pl-9"
                    />
                </div>

                {initialError ? (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-5 text-center text-sm text-red-700">
                        {initialError}
                    </div>
                ) : (
                    <div className="mt-4 max-h-[48vh] space-y-2 overflow-y-auto pr-1">
                        {filteredTenants.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-[#dce3e6] px-4 py-8 text-center text-sm text-[#758296]">
                                No se encontraron tenants activos.
                            </p>
                        ) : (
                            filteredTenants.map((tenant) => (
                                <button
                                    key={tenant.tenantID}
                                    onClick={() => handleSelectTenant(tenant)}
                                    className="flex w-full items-center gap-4 rounded-xl border border-[#dce3e6] bg-white px-4 py-3.5 text-left transition hover:border-[#16834e] hover:bg-[#f7fbf8]"
                                >
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e9f4ee] text-[#16834e]">
                                        <Building2 className="h-5 w-5" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-extrabold">{tenant.name}</span>
                                        <span className="mt-1 flex items-center gap-2 text-[10px] text-[#758296]">
                                            <strong className="rounded-full bg-[#edf0f2] px-2 py-0.5 text-[9px] text-[#39485b]">
                                                Admin
                                            </strong>
                                            {tenant.slug} · {tenant.planType}
                                        </span>
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-[#8994a3]" />
                                </button>
                            ))
                        )}
                    </div>
                )}
            </section>

            <Dialog open={Boolean(selectedTenant)} onOpenChange={(open) => !isEntering && !open && setSelectedTenant(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader className="border-b border-[#e5e7eb] px-6 py-5">
                        <DialogTitle>Ver como administrador</DialogTitle>
                        <DialogDescription>
                            Accederás a {selectedTenant?.name} con permisos administrativos.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 px-6 py-5">
                        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                            <ShieldCheck className="h-4 w-4 shrink-0" />
                            Todas las acciones utilizarán un token impersonado y afectarán datos reales del tenant.
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="impersonation-reason">Motivo del acceso</Label>
                            <Textarea
                                id="impersonation-reason"
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                placeholder={DEFAULT_REASON}
                                rows={3}
                                required
                            />
                            <p className="text-[10px] text-[#758296]">
                                El backend conservará este motivo en su registro de auditoría.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="border-t border-[#e5e7eb] px-6 py-4">
                        <button
                            type="button"
                            onClick={() => setSelectedTenant(null)}
                            disabled={isEntering}
                            className="rounded-md border border-[#dfe2e7] px-4 py-2 text-sm font-semibold text-[#536174] disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleImpersonate}
                            disabled={isEntering || !reason.trim()}
                            className="inline-flex items-center gap-2 rounded-md bg-[#0e5c3b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                            {isEntering && <Loader2 className="h-4 w-4 animate-spin" />}
                            {isEntering ? "Ingresando..." : "Ingresar al tenant"}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    )
}
