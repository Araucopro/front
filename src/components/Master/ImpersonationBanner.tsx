"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftRight, Loader2, ShieldCheck } from "lucide-react"
import { stopTenantImpersonation, type MasterImpersonationInfo } from "@/actions/master/impersonationActions"
import { useAuth } from "@/stores/user.store"
import { toast } from "sonner"

export default function ImpersonationBanner({ info }: { info: MasterImpersonationInfo }) {
    const router = useRouter()
    const clearTenantSession = useAuth((state) => state.logout)
    const [isRestoring, setIsRestoring] = useState(false)

    const handleReturn = async () => {
        if (isRestoring) return

        try {
            setIsRestoring(true)
            await stopTenantImpersonation()
            clearTenantSession()
            toast.success("Sesión master restaurada")
            router.replace("/access")
            router.refresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo restaurar la sesión master")
            setIsRestoring(false)
        }
    }

    return (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                    <p className="text-xs font-extrabold">Viendo como administrador de {info.tenantName}</p>
                    <p className="mt-1 truncate text-[10px] text-amber-800">
                        Acceso master impersonado · Motivo: {info.reason}
                    </p>
                </div>
            </div>
            <button
                onClick={handleReturn}
                disabled={isRestoring}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-amber-900 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-950 disabled:opacity-60"
            >
                {isRestoring ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                )}
                {isRestoring ? "Restaurando..." : "Cambiar acceso"}
            </button>
        </div>
    )
}
