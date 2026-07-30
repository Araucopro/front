"use client"

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react"
import { AlertTriangle, Boxes, Building2, Download, Loader2, RefreshCw, Users } from "lucide-react"
import {
    exportTenantData,
    getTenantMetrics,
    updateTenantStatus,
    updateTenantSubscription,
} from "@/actions/master/tenantActions"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import {
    TENANT_PLAN_TYPES,
    type ITenant,
    type ITenantMetrics,
    type TenantPlanType,
    type TenantStatus,
} from "@/interfaces/master/ITenant"
import { toast } from "sonner"

interface TenantManagementDialogProps {
    open: boolean
    tenant: ITenant | null
    onOpenChange: (open: boolean) => void
    onTenantChanged: () => void | Promise<void>
}

const STATUS_LABELS: Record<Exclude<TenantStatus, "PROVISIONING">, string> = {
    ACTIVE: "Activo",
    SUSPENDED: "Suspendido",
    ARCHIVED: "Archivado",
}

function toDateTimeLocal(value: string | null) {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""

    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    return localDate.toISOString().slice(0, 16)
}

function formatDate(value: string | null) {
    if (!value) return "Sin vencimiento"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "Fecha no disponible"

    return new Intl.DateTimeFormat("es-CL", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date)
}

function UsageCard({
    icon,
    label,
    count,
    max,
    percentage,
}: {
    icon: ReactNode
    label: string
    count: number
    max: number
    percentage: number
}) {
    const safePercentage = Math.max(0, Math.min(100, percentage))

    return (
        <article className="rounded-lg border border-[#dfe2e7] bg-white p-4">
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold text-[#122238]">
                    {icon}
                    {label}
                </span>
                <span className="text-xs font-extrabold text-[#0e5c3b]">{safePercentage}%</span>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-[#122238]">
                {count}
                <span className="ml-1 text-xs font-medium text-[#758296]">de {max}</span>
            </p>
            <Progress value={safePercentage} className="mt-3 h-2 bg-[#e8ecef]" />
        </article>
    )
}

export default function TenantManagementDialog({
    open,
    tenant,
    onOpenChange,
    onTenantChanged,
}: TenantManagementDialogProps) {
    const [metrics, setMetrics] = useState<ITenantMetrics | null>(null)
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSavingSubscription, setIsSavingSubscription] = useState(false)
    const [isSavingStatus, setIsSavingStatus] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [planType, setPlanType] = useState<TenantPlanType>("STANDARD")
    const [expiration, setExpiration] = useState("")
    const [autoRenew, setAutoRenew] = useState(true)
    const [nextStatus, setNextStatus] = useState<Exclude<TenantStatus, "PROVISIONING">>("ACTIVE")

    const loadMetrics = useCallback(async () => {
        if (!tenant) return

        try {
            setIsLoading(true)
            setError("")
            const response = await getTenantMetrics(tenant.tenantID)
            setMetrics(response)
            setPlanType(response.subscription.planType)
            setExpiration(toDateTimeLocal(response.subscription.expiresAt))
            setAutoRenew(response.subscription.autoRenew)
            if (response.status !== "PROVISIONING") setNextStatus(response.status)
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las métricas")
        } finally {
            setIsLoading(false)
        }
    }, [tenant])

    useEffect(() => {
        if (!open) return
        setMetrics(null)
        setError("")
        setPlanType(tenant?.planType ?? "STANDARD")
        setExpiration(toDateTimeLocal(tenant?.subscriptionExpiresAt ?? null))
        setAutoRenew(tenant?.autoRenew ?? true)
        if (tenant?.status && tenant.status !== "PROVISIONING") setNextStatus(tenant.status)
        void loadMetrics()
    }, [open, tenant, loadMetrics])

    const handleUpdateSubscription = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!tenant) return

        let subscriptionExpiresAt: string | undefined
        if (expiration) {
            const parsedDate = new Date(expiration)
            if (Number.isNaN(parsedDate.getTime())) {
                toast.error("La fecha de vencimiento no es válida")
                return
            }
            subscriptionExpiresAt = parsedDate.toISOString()
        }

        try {
            setIsSavingSubscription(true)
            await updateTenantSubscription(tenant.tenantID, {
                planType,
                ...(subscriptionExpiresAt ? { subscriptionExpiresAt } : {}),
                autoRenew,
            })
            toast.success("Suscripción actualizada correctamente")
            await Promise.all([loadMetrics(), onTenantChanged()])
        } catch (saveError) {
            toast.error(saveError instanceof Error ? saveError.message : "No se pudo actualizar la suscripción")
        } finally {
            setIsSavingSubscription(false)
        }
    }

    const handleUpdateStatus = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!tenant || metrics?.status === nextStatus) return

        const confirmed = window.confirm(
            `¿Confirmas cambiar el estado de ${tenant.name} a ${STATUS_LABELS[nextStatus]}?`,
        )
        if (!confirmed) return

        try {
            setIsSavingStatus(true)
            await updateTenantStatus(tenant.tenantID, nextStatus)
            toast.success("Estado del tenant actualizado")
            await Promise.all([loadMetrics(), onTenantChanged()])
        } catch (saveError) {
            toast.error(saveError instanceof Error ? saveError.message : "No se pudo actualizar el estado")
        } finally {
            setIsSavingStatus(false)
        }
    }

    const handleExport = async () => {
        if (!tenant) return

        const confirmed = window.confirm(
            "El respaldo puede contener información sensible. ¿Deseas descargarlo en este dispositivo?",
        )
        if (!confirmed) return

        try {
            setIsExporting(true)
            const backup = await exportTenantData(tenant.tenantID)
            const blob = new Blob([JSON.stringify(backup, null, 2)], {
                type: "application/json;charset=utf-8",
            })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            const date = new Date(backup.exportedAt).toISOString().slice(0, 10)
            const safeSlug = backup.tenant.slug.replace(/[^a-z0-9-]/gi, "-")

            link.href = url
            link.download = `${safeSlug}-backup-${date}.json`
            document.body.appendChild(link)
            link.click()
            link.remove()
            URL.revokeObjectURL(url)
            toast.success("Respaldo descargado correctamente")
        } catch (exportError) {
            toast.error(exportError instanceof Error ? exportError.message : "No se pudo exportar el respaldo")
        } finally {
            setIsExporting(false)
        }
    }

    const isBusy = isSavingSubscription || isSavingStatus || isExporting
    const currentStatus = metrics?.status ?? tenant?.status

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !isBusy && onOpenChange(nextOpen)}>
            <DialogContent className="max-w-3xl">
                <DialogHeader className="border-b border-[#e5e7eb] px-6 py-5">
                    <DialogTitle>Gestión del tenant</DialogTitle>
                    <DialogDescription>
                        {tenant?.name ?? "Tenant"} · {tenant?.slug}
                    </DialogDescription>
                    {tenant && <p className="break-all font-mono text-[9px] text-[#8994a3]">{tenant.tenantID}</p>}
                </DialogHeader>

                <div className="max-h-[72vh] overflow-y-auto bg-[#f7f8fa] px-6 py-5">
                    {isLoading && !metrics ? (
                        <div className="flex min-h-64 items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-[#0e5c3b]" />
                        </div>
                    ) : error && !metrics ? (
                        <div className="flex min-h-64 flex-col items-center justify-center text-center">
                            <AlertTriangle className="h-7 w-7 text-red-500" />
                            <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>
                            <button
                                onClick={loadMetrics}
                                className="mt-4 inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Reintentar
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {metrics?.usage.warningThresholdReached && (
                                <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    El tenant alcanzó el umbral de advertencia de capacidad.
                                </div>
                            )}

                            <section>
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#536174]">
                                        Uso y actividad
                                    </h3>
                                    <button
                                        onClick={loadMetrics}
                                        disabled={isLoading}
                                        className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#0e5c3b] disabled:opacity-50"
                                    >
                                        <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                                        Actualizar
                                    </button>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <UsageCard
                                        icon={<Building2 className="h-4 w-4 text-[#0e5c3b]" />}
                                        label="Tiendas"
                                        count={metrics?.usage.storesCount ?? 0}
                                        max={metrics?.usage.maxStores ?? tenant?.maxStores ?? 0}
                                        percentage={metrics?.usage.storesUsagePct ?? 0}
                                    />
                                    <UsageCard
                                        icon={<Users className="h-4 w-4 text-[#0e5c3b]" />}
                                        label="Usuarios"
                                        count={metrics?.usage.usersCount ?? 0}
                                        max={metrics?.usage.maxUsers ?? tenant?.maxUsers ?? 0}
                                        percentage={metrics?.usage.usersUsagePct ?? 0}
                                    />
                                    <article className="rounded-lg border border-[#dfe2e7] bg-white p-4">
                                        <span className="flex items-center gap-2 text-xs font-bold text-[#122238]">
                                            <Boxes className="h-4 w-4 text-[#0e5c3b]" />
                                            Productos
                                        </span>
                                        <p className="mt-3 text-2xl font-extrabold text-[#122238]">
                                            {metrics?.activity.productsCount ?? 0}
                                        </p>
                                        <p className="mt-3 text-[10px] text-[#758296]">productos registrados</p>
                                    </article>
                                </div>
                            </section>

                            <form
                                onSubmit={handleUpdateSubscription}
                                className="rounded-lg border border-[#dfe2e7] bg-white p-4"
                            >
                                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                                    <div>
                                        <h3 className="text-xs font-extrabold text-[#122238]">Suscripción</h3>
                                        <p className="mt-1 text-[10px] text-[#758296]">
                                            Vencimiento actual: {formatDate(metrics?.subscription.expiresAt ?? null)}
                                            {metrics?.subscription.daysRemaining !== null &&
                                                metrics?.subscription.daysRemaining !== undefined &&
                                                ` · ${metrics.subscription.daysRemaining} días restantes`}
                                        </p>
                                    </div>
                                    <span className="w-fit rounded-full bg-[#e8f5ee] px-3 py-1 text-[9px] font-bold text-[#0e5c3b]">
                                        {metrics?.subscription.planType ?? tenant?.planType}
                                    </span>
                                </div>

                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="subscription-plan">Tipo de plan</Label>
                                        <select
                                            id="subscription-plan"
                                            value={planType}
                                            onChange={(event) => setPlanType(event.target.value as TenantPlanType)}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            {TENANT_PLAN_TYPES.map((plan) => (
                                                <option key={plan} value={plan}>
                                                    {plan}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="subscription-expiration">Vencimiento</Label>
                                        <Input
                                            id="subscription-expiration"
                                            type="datetime-local"
                                            value={expiration}
                                            onChange={(event) => setExpiration(event.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between rounded-md border border-[#dfe2e7] px-3 py-2 sm:col-span-2">
                                        <div>
                                            <Label htmlFor="subscription-renew">Renovación automática</Label>
                                            <p className="mt-1 text-[10px] text-[#758296]">
                                                Autoriza la renovación al finalizar el período.
                                            </p>
                                        </div>
                                        <Switch
                                            id="subscription-renew"
                                            checked={autoRenew}
                                            onCheckedChange={setAutoRenew}
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSavingSubscription}
                                        className="inline-flex items-center gap-2 rounded-md bg-[#0e5c3b] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                                    >
                                        {isSavingSubscription && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                        Guardar suscripción
                                    </button>
                                </div>
                            </form>

                            <section className="grid gap-4 sm:grid-cols-2">
                                <form
                                    onSubmit={handleUpdateStatus}
                                    className="rounded-lg border border-[#dfe2e7] bg-white p-4"
                                >
                                    <h3 className="text-xs font-extrabold text-[#122238]">Estado del tenant</h3>
                                    <p className="mt-1 text-[10px] text-[#758296]">Estado actual: {currentStatus}</p>
                                    <select
                                        value={nextStatus}
                                        onChange={(event) =>
                                            setNextStatus(
                                                event.target.value as Exclude<TenantStatus, "PROVISIONING">,
                                            )
                                        }
                                        className="mt-4 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                                    >
                                        <option value="ACTIVE">Activo</option>
                                        <option value="SUSPENDED">Suspendido</option>
                                        <option value="ARCHIVED">Archivado</option>
                                    </select>
                                    <button
                                        type="submit"
                                        disabled={isSavingStatus || currentStatus === nextStatus}
                                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#dfe2e7] px-4 py-2 text-xs font-semibold text-[#39485b] hover:bg-[#f5f6f8] disabled:opacity-50"
                                    >
                                        {isSavingStatus && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                        Actualizar estado
                                    </button>
                                </form>

                                <div className="rounded-lg border border-[#dfe2e7] bg-white p-4">
                                    <h3 className="text-xs font-extrabold text-[#122238]">Respaldo de datos</h3>
                                    <p className="mt-1 text-[10px] leading-relaxed text-[#758296]">
                                        Descarga tiendas, usuarios, categorías y productos en formato JSON. El archivo
                                        puede contener información sensible.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleExport}
                                        disabled={isExporting}
                                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#122238] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                                    >
                                        {isExporting ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Download className="h-3.5 w-3.5" />
                                        )}
                                        Descargar respaldo
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
