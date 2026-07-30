"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react"
import { getTenants } from "@/actions/master/tenantActions"
import TenantManagementDialog from "@/components/Master/TenantManagementDialog"
import TenantProvisioningDialog from "@/components/Master/TenantProvisioningDialog"
import type { ITenant, ITenantListResponse, TenantStatus } from "@/interfaces/master/ITenant"
import { toast } from "sonner"

const EMPTY_TENANTS: ITenantListResponse = {
    items: [],
    total: 0,
    limit: 10,
    offset: 0,
}

const STATUS_LABELS: Record<TenantStatus, string> = {
    PROVISIONING: "Provisionando",
    ACTIVE: "Activo",
    SUSPENDED: "Suspendido",
    ARCHIVED: "Archivado",
}

const STATUS_CLASSES: Record<TenantStatus, string> = {
    PROVISIONING: "bg-amber-100 text-amber-800",
    ACTIVE: "bg-[#ccf8e4] text-[#08744a]",
    SUSPENDED: "bg-red-100 text-red-700",
    ARCHIVED: "bg-slate-200 text-slate-700",
}

interface TenantManagementProps {
    initialTenants?: ITenantListResponse
    initialError?: string
    onTotalChange?: (total: number) => void
}

type TenantReference = Pick<ITenant, "tenantID" | "name">

function formatDate(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "—"

    return new Intl.DateTimeFormat("es-CL", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date)
}

export default function TenantManagement({
    initialTenants,
    initialError,
    onTotalChange,
}: TenantManagementProps) {
    const [tenants, setTenants] = useState(initialTenants ?? EMPTY_TENANTS)
    const [error, setError] = useState(initialError ?? "")
    const [isLoading, setIsLoading] = useState(false)
    const [isProvisioningOpen, setIsProvisioningOpen] = useState(false)
    const [selectedTenant, setSelectedTenant] = useState<TenantReference | null>(null)
    const [isManagementOpen, setIsManagementOpen] = useState(false)
    const [managedTenant, setManagedTenant] = useState<ITenant | null>(null)

    const currentPage = Math.floor(tenants.offset / tenants.limit) + 1
    const totalPages = Math.max(1, Math.ceil(tenants.total / tenants.limit))

    const loadTenants = async (offset: number) => {
        try {
            setIsLoading(true)
            setError("")
            const response = await getTenants({ limit: tenants.limit, offset })
            setTenants(response)
            onTotalChange?.(response.total)
        } catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : "No se pudieron cargar los tenants"
            setError(message)
            toast.error(message)
        } finally {
            setIsLoading(false)
        }
    }

    const startNewTenant = () => {
        setSelectedTenant(null)
        setIsProvisioningOpen(true)
    }

    const resumeProvisioning = (tenant: ITenant) => {
        setSelectedTenant({ tenantID: tenant.tenantID, name: tenant.name })
        setIsProvisioningOpen(true)
    }

    const manageTenant = (tenant: ITenant) => {
        setManagedTenant(tenant)
        setIsManagementOpen(true)
    }

    return (
        <section className="mt-6">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h2 className="text-sm font-extrabold">Negocios registrados</h2>
                    <p className="mt-1 text-[10px] text-[#758296]">
                        {tenants.total} {tenants.total === 1 ? "tenant registrado" : "tenants registrados"}
                    </p>
                </div>
                <button
                    onClick={startNewTenant}
                    className="rounded-[10px] bg-[#0e5c3b] px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#0b4e32]"
                >
                    + Dar de alta nuevo negocio
                </button>
            </div>

            <div className="overflow-hidden rounded-[13px] border border-[#dfe2e7] bg-white">
                {error && (
                    <div className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-5 py-3 text-xs text-red-700">
                        <span>{error}</span>
                        <button
                            onClick={() => loadTenants(tenants.offset)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1.5 font-semibold hover:underline disabled:opacity-60"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                            Reintentar
                        </button>
                    </div>
                )}

                <div className="relative overflow-x-auto">
                    {isLoading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                            <Loader2 className="h-5 w-5 animate-spin text-[#0e5c3b]" />
                        </div>
                    )}
                    <table className="w-full min-w-[1080px] border-collapse text-left">
                        <thead>
                            <tr className="border-b border-[#dfe2e7] bg-[#fbfbfc]">
                                {[
                                    "Negocio",
                                    "Slug",
                                    "Plan",
                                    "Tiendas",
                                    "Usuarios",
                                    "Configuración",
                                    "Creado",
                                    "Estado",
                                    "Acciones",
                                ].map((heading) => (
                                    <th
                                        key={heading}
                                        className="px-5 py-3.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#5f6b7c]"
                                    >
                                        {heading}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {tenants.items.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-5 py-12 text-center text-xs text-[#758296]">
                                        {error ? "No fue posible obtener los tenants." : "Aún no hay tenants registrados."}
                                    </td>
                                </tr>
                            ) : (
                                tenants.items.map((tenant) => (
                                    <tr key={tenant.tenantID} className="border-b border-[#eceef1] last:border-0">
                                        <td className="px-5 py-3.5">
                                            <p className="text-[11px] font-extrabold text-[#122238]">{tenant.name}</p>
                                            <p className="mt-1 max-w-[180px] truncate font-mono text-[8px] text-[#8994a3]">
                                                {tenant.tenantID}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3.5 font-mono text-[10px] text-[#536174]">{tenant.slug}</td>
                                        <td className="px-5 py-3.5 text-[10px] font-semibold text-[#39485b]">
                                            {tenant.planType}
                                        </td>
                                        <td className="px-5 py-3.5 text-center text-[11px] font-bold">{tenant.maxStores}</td>
                                        <td className="px-5 py-3.5 text-center text-[11px] font-bold">{tenant.maxUsers}</td>
                                        <td className="px-5 py-3.5">
                                            <p className="text-[10px] text-[#39485b]">{tenant.timeZone}</p>
                                            <p className="mt-1 text-[9px] text-[#8994a3]">{tenant.locale}</p>
                                        </td>
                                        <td className="px-5 py-3.5 text-[10px] text-[#536174]">
                                            {formatDate(tenant.createdAt)}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span
                                                className={`whitespace-nowrap rounded-full px-3 py-1 text-[9px] font-semibold ${STATUS_CLASSES[tenant.status]}`}
                                            >
                                                {STATUS_LABELS[tenant.status]}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                {tenant.status === "PROVISIONING" ? (
                                                    <button
                                                        onClick={() => resumeProvisioning(tenant)}
                                                        className="whitespace-nowrap rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-[9px] font-bold text-amber-800 hover:bg-amber-100"
                                                    >
                                                        Continuar provisión
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => manageTenant(tenant)}
                                                        className="whitespace-nowrap rounded-md border border-[#b9c7d3] bg-white px-3 py-1.5 text-[9px] font-bold text-[#294157] hover:bg-[#f5f7f8]"
                                                    >
                                                        Gestionar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t border-[#eceef1] px-5 py-3">
                    <p className="text-[10px] text-[#758296]">
                        Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            aria-label="Página anterior"
                            onClick={() => loadTenants(Math.max(0, tenants.offset - tenants.limit))}
                            disabled={isLoading || tenants.offset === 0}
                            className="rounded-md border border-[#dfe2e7] p-2 text-[#536174] hover:bg-[#f5f6f8] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                            aria-label="Página siguiente"
                            onClick={() => loadTenants(tenants.offset + tenants.limit)}
                            disabled={isLoading || tenants.offset + tenants.limit >= tenants.total}
                            className="rounded-md border border-[#dfe2e7] p-2 text-[#536174] hover:bg-[#f5f6f8] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            <TenantProvisioningDialog
                open={isProvisioningOpen}
                tenant={selectedTenant}
                onOpenChange={setIsProvisioningOpen}
                onTenantsChanged={() => loadTenants(0)}
            />

            <TenantManagementDialog
                open={isManagementOpen}
                tenant={managedTenant}
                onOpenChange={setIsManagementOpen}
                onTenantChanged={() => loadTenants(tenants.offset)}
            />
        </section>
    )
}
