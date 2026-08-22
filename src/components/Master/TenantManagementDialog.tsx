"use client"

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react"
import {
    AlertTriangle,
    Boxes,
    Building2,
    Download,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    Store,
    Users,
    X,
} from "lucide-react"
import {
    createTenantStore,
    createTenantUser,
    exportTenantData,
    getTenant,
    getTenantMetrics,
    updateTenantStatus,
    updateTenantStore,
    updateTenantSubscription,
    updateTenantUser,
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
    type ICreateTenantStore,
    type ICreateTenantUser,
    type ITenant,
    type ITenantMetrics,
    type IUpdateTenantStore,
    type IUpdateTenantUser,
    type TenantPlanType,
    type TenantStatus,
} from "@/interfaces/master/ITenant"
import type { IStore } from "@/interfaces/stores/IStore"
import type { IUser } from "@/interfaces/users/IUser"
import { STORE_TYPE_OPTIONS, type StoreTypeValue } from "@/lib/storeTypes"
import type { UserRole } from "@/lib/userRoles"
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

const USER_ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
    { value: "admin", label: "Admin" },
    { value: "store_manager", label: "Vendedor" },
    { value: "consignado", label: "Consignado" },
    { value: "tercero", label: "Tercero" },
]

type DirectoryForm = "user" | "store" | null
type UserFormState = ICreateTenantUser
type StoreFormState = ICreateTenantStore

const EMPTY_USER_FORM: UserFormState = {
    email: "",
    name: "",
    role: "store_manager",
    status: "ACTIVE",
    userImg: "",
    password: "",
}

const EMPTY_STORE_FORM: StoreFormState = {
    location: "",
    rut: "",
    address: "",
    phone: "",
    city: "",
    email: "",
    name: "",
    type: "third_party",
    isCentralStore: false,
    storeImg: "",
    giro: "",
    acteco: "",
    cdgSIISucur: "",
    businessName: "",
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
    const [tenantDetail, setTenantDetail] = useState<ITenant | null>(tenant)
    const [activeForm, setActiveForm] = useState<DirectoryForm>(null)
    const [editingUserID, setEditingUserID] = useState("")
    const [editingStoreID, setEditingStoreID] = useState("")
    const [userForm, setUserForm] = useState<UserFormState>(EMPTY_USER_FORM)
    const [storeForm, setStoreForm] = useState<StoreFormState>(EMPTY_STORE_FORM)
    const [isSavingDirectory, setIsSavingDirectory] = useState(false)

    const currentTenant = tenantDetail ?? tenant
    const tenantUsers = currentTenant?.users ?? []
    const tenantStores = currentTenant?.stores ?? []

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

    const loadTenantDetail = useCallback(async () => {
        if (!tenant) return

        const response = await getTenant(tenant.tenantID)
        setTenantDetail(response)
    }, [tenant])

    useEffect(() => {
        if (!open) return
        setMetrics(null)
        setTenantDetail(tenant)
        setError("")
        setActiveForm(null)
        setEditingUserID("")
        setEditingStoreID("")
        setUserForm(EMPTY_USER_FORM)
        setStoreForm(EMPTY_STORE_FORM)
        setPlanType(tenant?.planType ?? "STANDARD")
        setExpiration(toDateTimeLocal(tenant?.subscriptionExpiresAt ?? null))
        setAutoRenew(tenant?.autoRenew ?? true)
        if (tenant?.status && tenant.status !== "PROVISIONING") setNextStatus(tenant.status)
        void loadMetrics()
        void loadTenantDetail().catch(() => null)
    }, [open, tenant, loadMetrics, loadTenantDetail])

    const refreshTenantData = async () => {
        await Promise.all([loadTenantDetail(), loadMetrics(), onTenantChanged()])
    }

    const openCreateUserForm = () => {
        setEditingUserID("")
        setUserForm(EMPTY_USER_FORM)
        setActiveForm("user")
    }

    const openEditUserForm = (user: IUser) => {
        setEditingUserID(user.userID)
        setUserForm({
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status ?? "ACTIVE",
            userImg: user.userImg ?? "",
            password: "",
        })
        setActiveForm("user")
    }

    const openCreateStoreForm = () => {
        setEditingStoreID("")
        setStoreForm(EMPTY_STORE_FORM)
        setActiveForm("store")
    }

    const openEditStoreForm = (store: IStore) => {
        setEditingStoreID(store.storeID)
        setStoreForm({
            location: store.location,
            rut: store.rut,
            address: store.address,
            phone: store.phone,
            city: store.city,
            email: store.email,
            name: store.name,
            type: (store.type || "third_party") as StoreTypeValue,
            isCentralStore: Boolean(store.isCentralStore),
            storeImg: store.storeImg ?? "",
            giro: store.giro ?? "",
            acteco: store.acteco ?? "",
            cdgSIISucur: store.cdgSIISucur ?? "",
            businessName: store.businessName ?? "",
        })
        setActiveForm("store")
    }

    const handleSaveUser = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!currentTenant) return

        const name = userForm.name.trim()
        const email = userForm.email.trim()
        const userImg = userForm.userImg?.trim()

        if (!name || !email) {
            toast.error("Completa nombre y correo del usuario")
            return
        }
        if (!editingUserID && userForm.password.length < 8) {
            toast.error("La contraseÃ±a debe tener al menos 8 caracteres")
            return
        }
        if (editingUserID && userForm.password && userForm.password.length < 6) {
            toast.error("La nueva contraseÃ±a debe tener al menos 6 caracteres")
            return
        }

        try {
            setIsSavingDirectory(true)
            if (editingUserID) {
                const payload: IUpdateTenantUser = {
                    name,
                    role: userForm.role,
                    status: userForm.status,
                    ...(userImg ? { userImg } : {}),
                    ...(userForm.password ? { password: userForm.password } : {}),
                }
                await updateTenantUser(currentTenant.tenantID, editingUserID, payload)
                toast.success("Usuario actualizado correctamente")
            } else {
                const payload: ICreateTenantUser = {
                    email,
                    name,
                    role: userForm.role,
                    status: userForm.status,
                    ...(userImg ? { userImg } : {}),
                    password: userForm.password,
                }
                await createTenantUser(currentTenant.tenantID, payload)
                toast.success("Usuario creado correctamente")
            }

            setActiveForm(null)
            await refreshTenantData()
        } catch (saveError) {
            toast.error(saveError instanceof Error ? saveError.message : "No se pudo guardar el usuario")
        } finally {
            setIsSavingDirectory(false)
        }
    }

    const handleSaveStore = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!currentTenant) return

        const requiredFields = {
            location: storeForm.location.trim(),
            rut: storeForm.rut.trim(),
            address: storeForm.address.trim(),
            phone: storeForm.phone.trim(),
            city: storeForm.city.trim(),
            email: storeForm.email.trim(),
            name: storeForm.name.trim(),
        }

        if (Object.values(requiredFields).some((value) => !value)) {
            toast.error("Completa los datos obligatorios de la tienda")
            return
        }

        const optionalFields = {
            storeImg: storeForm.storeImg?.trim(),
            giro: storeForm.giro?.trim(),
            acteco: storeForm.acteco?.trim(),
            cdgSIISucur: storeForm.cdgSIISucur?.trim(),
            businessName: storeForm.businessName?.trim(),
        }

        const payload: ICreateTenantStore = {
            ...requiredFields,
            type: storeForm.type,
            isCentralStore: storeForm.isCentralStore,
            ...(optionalFields.storeImg ? { storeImg: optionalFields.storeImg } : {}),
            ...(optionalFields.giro ? { giro: optionalFields.giro } : {}),
            ...(optionalFields.acteco ? { acteco: optionalFields.acteco } : {}),
            ...(optionalFields.cdgSIISucur ? { cdgSIISucur: optionalFields.cdgSIISucur } : {}),
            ...(optionalFields.businessName ? { businessName: optionalFields.businessName } : {}),
        }

        try {
            setIsSavingDirectory(true)
            if (editingStoreID) {
                await updateTenantStore(currentTenant.tenantID, editingStoreID, payload as IUpdateTenantStore)
                toast.success("Tienda actualizada correctamente")
            } else {
                await createTenantStore(currentTenant.tenantID, payload)
                toast.success("Tienda creada correctamente")
            }

            setActiveForm(null)
            await refreshTenantData()
        } catch (saveError) {
            toast.error(saveError instanceof Error ? saveError.message : "No se pudo guardar la tienda")
        } finally {
            setIsSavingDirectory(false)
        }
    }

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

    const isBusy = isSavingSubscription || isSavingStatus || isExporting || isSavingDirectory
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

                            <section className="grid gap-4 lg:grid-cols-2">
                                <article className="rounded-lg border border-[#dfe2e7] bg-white p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="flex items-center gap-2 text-xs font-extrabold text-[#122238]">
                                                <Users className="h-4 w-4 text-[#0e5c3b]" />
                                                Usuarios
                                            </h3>
                                            <p className="mt-1 text-[10px] text-[#758296]">
                                                {tenantUsers.length} de {metrics?.usage.maxUsers ?? currentTenant?.maxUsers ?? 0}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={openCreateUserForm}
                                            disabled={isSavingDirectory}
                                            className="inline-flex items-center gap-1.5 rounded-md border border-[#cbd5df] px-3 py-1.5 text-[10px] font-bold text-[#294157] hover:bg-[#f5f7f8] disabled:opacity-50"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Nuevo
                                        </button>
                                    </div>

                                    {activeForm === "user" && (
                                        <form
                                            onSubmit={handleSaveUser}
                                            className="mt-4 grid gap-3 rounded-md border border-[#e1e6eb] bg-[#f8f9fb] p-3"
                                        >
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div className="space-y-1">
                                                    <Label htmlFor="tenant-user-name">Nombre</Label>
                                                    <Input
                                                        id="tenant-user-name"
                                                        value={userForm.name}
                                                        onChange={(event) =>
                                                            setUserForm((current) => ({
                                                                ...current,
                                                                name: event.target.value,
                                                            }))
                                                        }
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="tenant-user-email">Correo</Label>
                                                    <Input
                                                        id="tenant-user-email"
                                                        type="email"
                                                        value={userForm.email}
                                                        onChange={(event) =>
                                                            setUserForm((current) => ({
                                                                ...current,
                                                                email: event.target.value,
                                                            }))
                                                        }
                                                        disabled={Boolean(editingUserID)}
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="tenant-user-role">Rol</Label>
                                                    <select
                                                        id="tenant-user-role"
                                                        value={userForm.role}
                                                        onChange={(event) =>
                                                            setUserForm((current) => ({
                                                                ...current,
                                                                role: event.target.value as UserRole,
                                                            }))
                                                        }
                                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                                                    >
                                                        {USER_ROLE_OPTIONS.map((role) => (
                                                            <option key={role.value} value={role.value}>
                                                                {role.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="tenant-user-status">Estado</Label>
                                                    <select
                                                        id="tenant-user-status"
                                                        value={userForm.status ?? "ACTIVE"}
                                                        onChange={(event) =>
                                                            setUserForm((current) => ({
                                                                ...current,
                                                                status: event.target.value as IUser["status"],
                                                            }))
                                                        }
                                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                                                    >
                                                        <option value="ACTIVE">Activo</option>
                                                        <option value="INACTIVE">Inactivo</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1 sm:col-span-2">
                                                    <Label htmlFor="tenant-user-img">Imagen</Label>
                                                    <Input
                                                        id="tenant-user-img"
                                                        value={userForm.userImg ?? ""}
                                                        onChange={(event) =>
                                                            setUserForm((current) => ({
                                                                ...current,
                                                                userImg: event.target.value,
                                                            }))
                                                        }
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                                <div className="space-y-1 sm:col-span-2">
                                                    <Label htmlFor="tenant-user-password">
                                                        {editingUserID ? "Nueva contraseÃ±a" : "ContraseÃ±a"}
                                                    </Label>
                                                    <Input
                                                        id="tenant-user-password"
                                                        type="password"
                                                        minLength={editingUserID ? 6 : 8}
                                                        value={userForm.password}
                                                        onChange={(event) =>
                                                            setUserForm((current) => ({
                                                                ...current,
                                                                password: event.target.value,
                                                            }))
                                                        }
                                                        placeholder={editingUserID ? "Opcional" : "MÃ­nimo 8 caracteres"}
                                                        required={!editingUserID}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveForm(null)}
                                                    disabled={isSavingDirectory}
                                                    className="inline-flex items-center gap-1.5 rounded-md border border-[#dfe2e7] px-3 py-2 text-xs font-semibold text-[#536174] disabled:opacity-50"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isSavingDirectory}
                                                    className="inline-flex items-center gap-1.5 rounded-md bg-[#0e5c3b] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                                                >
                                                    {isSavingDirectory && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                                    Guardar
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    <div className="mt-4 space-y-2">
                                        {tenantUsers.length === 0 ? (
                                            <p className="rounded-md border border-dashed border-[#dfe2e7] px-3 py-5 text-center text-xs text-[#758296]">
                                                Sin usuarios registrados.
                                            </p>
                                        ) : (
                                            tenantUsers.map((user) => (
                                                <div
                                                    key={user.userID}
                                                    className="flex items-center justify-between gap-3 rounded-md border border-[#edf0f2] px-3 py-2"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-bold text-[#122238]">{user.name}</p>
                                                        <p className="truncate text-[10px] text-[#758296]">
                                                            {user.email} Â· {user.role}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditUserForm(user)}
                                                        disabled={isSavingDirectory}
                                                        aria-label={`Editar usuario ${user.name}`}
                                                        className="shrink-0 rounded-md border border-[#dfe2e7] p-2 text-[#536174] hover:bg-[#f5f6f8] disabled:opacity-50"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </article>

                                <article className="rounded-lg border border-[#dfe2e7] bg-white p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="flex items-center gap-2 text-xs font-extrabold text-[#122238]">
                                                <Store className="h-4 w-4 text-[#0e5c3b]" />
                                                Tiendas
                                            </h3>
                                            <p className="mt-1 text-[10px] text-[#758296]">
                                                {tenantStores.length} de {metrics?.usage.maxStores ?? currentTenant?.maxStores ?? 0}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={openCreateStoreForm}
                                            disabled={isSavingDirectory}
                                            className="inline-flex items-center gap-1.5 rounded-md border border-[#cbd5df] px-3 py-1.5 text-[10px] font-bold text-[#294157] hover:bg-[#f5f7f8] disabled:opacity-50"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Nueva
                                        </button>
                                    </div>

                                    {activeForm === "store" && (
                                        <form
                                            onSubmit={handleSaveStore}
                                            className="mt-4 grid gap-3 rounded-md border border-[#e1e6eb] bg-[#f8f9fb] p-3"
                                        >
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div className="space-y-1">
                                                    <Label htmlFor="tenant-store-name">Nombre</Label>
                                                    <Input
                                                        id="tenant-store-name"
                                                        value={storeForm.name}
                                                        onChange={(event) =>
                                                            setStoreForm((current) => ({
                                                                ...current,
                                                                name: event.target.value,
                                                            }))
                                                        }
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="tenant-store-email">Correo</Label>
                                                    <Input
                                                        id="tenant-store-email"
                                                        type="email"
                                                        value={storeForm.email}
                                                        onChange={(event) =>
                                                            setStoreForm((current) => ({
                                                                ...current,
                                                                email: event.target.value,
                                                            }))
                                                        }
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="tenant-store-rut">RUT</Label>
                                                    <Input
                                                        id="tenant-store-rut"
                                                        value={storeForm.rut}
                                                        onChange={(event) =>
                                                            setStoreForm((current) => ({
                                                                ...current,
                                                                rut: event.target.value,
                                                            }))
                                                        }
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="tenant-store-phone">TelÃ©fono</Label>
                                                    <Input
                                                        id="tenant-store-phone"
                                                        value={storeForm.phone}
                                                        onChange={(event) =>
                                                            setStoreForm((current) => ({
                                                                ...current,
                                                                phone: event.target.value,
                                                            }))
                                                        }
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="tenant-store-location">Comuna o sector</Label>
                                                    <Input
                                                        id="tenant-store-location"
                                                        value={storeForm.location}
                                                        onChange={(event) =>
                                                            setStoreForm((current) => ({
                                                                ...current,
                                                                location: event.target.value,
                                                            }))
                                                        }
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="tenant-store-city">Ciudad</Label>
                                                    <Input
                                                        id="tenant-store-city"
                                                        value={storeForm.city}
                                                        onChange={(event) =>
                                                            setStoreForm((current) => ({
                                                                ...current,
                                                                city: event.target.value,
                                                            }))
                                                        }
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-1 sm:col-span-2">
                                                    <Label htmlFor="tenant-store-address">DirecciÃ³n</Label>
                                                    <Input
                                                        id="tenant-store-address"
                                                        value={storeForm.address}
                                                        onChange={(event) =>
                                                            setStoreForm((current) => ({
                                                                ...current,
                                                                address: event.target.value,
                                                            }))
                                                        }
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="tenant-store-type">Tipo</Label>
                                                    <select
                                                        id="tenant-store-type"
                                                        value={storeForm.type}
                                                        onChange={(event) =>
                                                            setStoreForm((current) => ({
                                                                ...current,
                                                                type: event.target.value as StoreTypeValue,
                                                            }))
                                                        }
                                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                                                    >
                                                        {STORE_TYPE_OPTIONS.map((type) => (
                                                            <option key={type.value} value={type.value}>
                                                                {type.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <label className="flex items-center gap-2 rounded-md border border-[#dfe2e7] px-3 py-2 text-xs font-semibold text-[#39485b]">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(storeForm.isCentralStore)}
                                                        onChange={(event) =>
                                                            setStoreForm((current) => ({
                                                                ...current,
                                                                isCentralStore: event.target.checked,
                                                            }))
                                                        }
                                                        className="h-4 w-4"
                                                    />
                                                    Tienda central
                                                </label>
                                                <div className="space-y-1 sm:col-span-2">
                                                    <Label htmlFor="tenant-store-img">Imagen</Label>
                                                    <Input
                                                        id="tenant-store-img"
                                                        value={storeForm.storeImg ?? ""}
                                                        onChange={(event) =>
                                                            setStoreForm((current) => ({
                                                                ...current,
                                                                storeImg: event.target.value,
                                                            }))
                                                        }
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                                <div className="space-y-1 sm:col-span-2">
                                                    <Label htmlFor="tenant-store-business-name">RazÃ³n social</Label>
                                                    <Input
                                                        id="tenant-store-business-name"
                                                        value={storeForm.businessName ?? ""}
                                                        onChange={(event) =>
                                                            setStoreForm((current) => ({
                                                                ...current,
                                                                businessName: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1 sm:col-span-2">
                                                    <Label htmlFor="tenant-store-giro">Giro</Label>
                                                    <Input
                                                        id="tenant-store-giro"
                                                        value={storeForm.giro ?? ""}
                                                        onChange={(event) =>
                                                            setStoreForm((current) => ({
                                                                ...current,
                                                                giro: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="tenant-store-acteco">ACTECO</Label>
                                                    <Input
                                                        id="tenant-store-acteco"
                                                        value={storeForm.acteco ?? ""}
                                                        onChange={(event) =>
                                                            setStoreForm((current) => ({
                                                                ...current,
                                                                acteco: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="tenant-store-sii-code">CÃ³digo SII</Label>
                                                    <Input
                                                        id="tenant-store-sii-code"
                                                        value={storeForm.cdgSIISucur ?? ""}
                                                        onChange={(event) =>
                                                            setStoreForm((current) => ({
                                                                ...current,
                                                                cdgSIISucur: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveForm(null)}
                                                    disabled={isSavingDirectory}
                                                    className="inline-flex items-center gap-1.5 rounded-md border border-[#dfe2e7] px-3 py-2 text-xs font-semibold text-[#536174] disabled:opacity-50"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isSavingDirectory}
                                                    className="inline-flex items-center gap-1.5 rounded-md bg-[#0e5c3b] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                                                >
                                                    {isSavingDirectory && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                                    Guardar
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    <div className="mt-4 space-y-2">
                                        {tenantStores.length === 0 ? (
                                            <p className="rounded-md border border-dashed border-[#dfe2e7] px-3 py-5 text-center text-xs text-[#758296]">
                                                Sin tiendas registradas.
                                            </p>
                                        ) : (
                                            tenantStores.map((store) => (
                                                <div
                                                    key={store.storeID}
                                                    className="flex items-center justify-between gap-3 rounded-md border border-[#edf0f2] px-3 py-2"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-bold text-[#122238]">{store.name}</p>
                                                        <p className="truncate text-[10px] text-[#758296]">
                                                            {store.email} Â· {store.type ?? "sin tipo"}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditStoreForm(store)}
                                                        disabled={isSavingDirectory}
                                                        aria-label={`Editar tienda ${store.name}`}
                                                        className="shrink-0 rounded-md border border-[#dfe2e7] p-2 text-[#536174] hover:bg-[#f5f6f8] disabled:opacity-50"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </article>
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
