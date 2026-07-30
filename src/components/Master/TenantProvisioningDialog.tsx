"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Check, Loader2 } from "lucide-react"
import { createTenant, provisionTenant } from "@/actions/master/tenantActions"
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
import type {
    ICreateTenant,
    IProvisionTenantResponse,
    IProvisionTenantStore,
    IProvisionTenantUser,
    ITenant,
} from "@/interfaces/master/ITenant"
import { toast } from "sonner"

type TenantReference = Pick<ITenant, "tenantID" | "name">
type WizardStep = 1 | 2 | 3

interface TenantProvisioningDialogProps {
    open: boolean
    tenant?: TenantReference | null
    onOpenChange: (open: boolean) => void
    onTenantsChanged: () => void | Promise<void>
}

const INITIAL_TENANT: ICreateTenant = {
    name: "",
    status: "PROVISIONING",
    maxStores: 5,
    maxUsers: 10,
    timeZone: "America/Santiago",
    locale: "es-CL",
}

const INITIAL_USER: IProvisionTenantUser = {
    email: "",
    name: "",
    role: "admin",
    password: "",
}

const INITIAL_STORE: IProvisionTenantStore = {
    location: "",
    rut: "",
    address: "",
    phone: "",
    city: "",
    email: "",
    name: "",
    type: "central",
    isCentralStore: true,
    giro: "",
    acteco: "",
    cdgSIISucur: "",
    businessName: "",
}

const STEPS = [
    { number: 1, label: "Crear tenant" },
    { number: 2, label: "Provisionar" },
    { number: 3, label: "Completado" },
] as const

function StepIndicator({ step }: { step: WizardStep }) {
    return (
        <div className="grid grid-cols-3 border-b border-[#e5e7eb] bg-[#f8faf9] px-6 py-4">
            {STEPS.map((item) => {
                const isComplete = step > item.number
                const isCurrent = step === item.number

                return (
                    <div key={item.number} className="flex items-center gap-2">
                        <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                                isComplete || isCurrent
                                    ? "bg-[#0e5c3b] text-white"
                                    : "bg-[#dfe4e8] text-[#758296]"
                            }`}
                        >
                            {isComplete ? <Check className="h-3.5 w-3.5" /> : item.number}
                        </span>
                        <span
                            className={`hidden text-[10px] font-semibold sm:block ${
                                isCurrent ? "text-[#0e5c3b]" : "text-[#758296]"
                            }`}
                        >
                            {item.label}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

export default function TenantProvisioningDialog({
    open,
    tenant,
    onOpenChange,
    onTenantsChanged,
}: TenantProvisioningDialogProps) {
    const [step, setStep] = useState<WizardStep>(tenant ? 2 : 1)
    const [tenantForm, setTenantForm] = useState<ICreateTenant>(INITIAL_TENANT)
    const [userForm, setUserForm] = useState<IProvisionTenantUser>(INITIAL_USER)
    const [storeForm, setStoreForm] = useState<IProvisionTenantStore>(INITIAL_STORE)
    const [tenantID, setTenantID] = useState(tenant?.tenantID ?? "")
    const [tenantName, setTenantName] = useState(tenant?.name ?? "")
    const [result, setResult] = useState<IProvisionTenantResponse | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (!open) return

        setStep(tenant ? 2 : 1)
        setTenantForm(INITIAL_TENANT)
        setUserForm(INITIAL_USER)
        setStoreForm({
            ...INITIAL_STORE,
            name: tenant ? `${tenant.name} Central` : "",
        })
        setTenantID(tenant?.tenantID ?? "")
        setTenantName(tenant?.name ?? "")
        setResult(null)
    }, [open, tenant])

    const handleCreateTenant = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const name = tenantForm.name.trim()
        if (name.length < 2) {
            toast.error("El nombre debe tener al menos 2 caracteres")
            return
        }
        if (tenantForm.maxStores < 1 || tenantForm.maxUsers < 1) {
            toast.error("Los límites de tiendas y usuarios deben ser mayores a cero")
            return
        }

        try {
            setIsSubmitting(true)
            const createdTenant = await createTenant({
                ...tenantForm,
                name,
                status: "PROVISIONING",
                timeZone: tenantForm.timeZone.trim(),
                locale: tenantForm.locale.trim(),
            })

            setTenantID(createdTenant.tenantID)
            setTenantName(createdTenant.name)
            setStoreForm((current) => ({
                ...current,
                name: current.name || `${createdTenant.name} Central`,
            }))
            setStep(2)
            toast.success("Tenant creado. Continúa con el usuario y la tienda.")
            void onTenantsChanged()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo crear el tenant")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleProvisionTenant = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!tenantID) {
            toast.error("No se encontró el tenant que se debe provisionar")
            return
        }
        if (userForm.password.length < 8) {
            toast.error("La contraseña debe tener al menos 8 caracteres")
            return
        }

        const store: IProvisionTenantStore = {
            location: storeForm.location.trim(),
            rut: storeForm.rut.trim(),
            address: storeForm.address.trim(),
            phone: storeForm.phone.trim(),
            city: storeForm.city.trim(),
            email: storeForm.email.trim(),
            name: storeForm.name.trim(),
            type: "central",
            isCentralStore: true,
        }

        const giro = storeForm.giro?.trim()
        const acteco = storeForm.acteco?.trim()
        const cdgSIISucur = storeForm.cdgSIISucur?.trim()
        const businessName = storeForm.businessName?.trim()

        if (giro) store.giro = giro
        if (acteco) store.acteco = acteco
        if (cdgSIISucur) store.cdgSIISucur = cdgSIISucur
        if (businessName) store.businessName = businessName

        try {
            setIsSubmitting(true)
            const provisioned = await provisionTenant(tenantID, {
                user: {
                    email: userForm.email.trim(),
                    name: userForm.name.trim(),
                    role: "admin",
                    password: userForm.password,
                },
                store,
            })

            setResult(provisioned)
            setStep(3)
            toast.success("Tenant provisionado y activado correctamente")
            await onTenantsChanged()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo provisionar el tenant")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !isSubmitting && onOpenChange(nextOpen)}>
            <DialogContent className="max-w-3xl">
                <DialogHeader className="px-6 pb-4 pt-5">
                    <DialogTitle>Alta de tenant</DialogTitle>
                    <DialogDescription>
                        {step === 1 && "Primero registra los límites y la configuración del tenant."}
                        {step === 2 &&
                            `Ahora crea el administrador y la tienda central de ${tenantName || "este tenant"}.`}
                        {step === 3 && "El tenant quedó completamente provisionado y activo."}
                    </DialogDescription>
                </DialogHeader>

                <StepIndicator step={step} />

                {step === 1 && (
                    <form onSubmit={handleCreateTenant}>
                        <div className="grid max-h-[60vh] gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="tenant-name">Nombre del negocio</Label>
                                <Input
                                    id="tenant-name"
                                    value={tenantForm.name}
                                    onChange={(event) =>
                                        setTenantForm((current) => ({ ...current, name: event.target.value }))
                                    }
                                    minLength={2}
                                    placeholder="Comercial ACME"
                                    autoFocus
                                    required
                                />
                                <p className="text-[10px] text-[#758296]">
                                    El backend generará automáticamente el slug.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Estado inicial</Label>
                                <div className="flex h-10 items-center rounded-md border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-800">
                                    PROVISIONING
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tenant-timezone">Zona horaria</Label>
                                <Input
                                    id="tenant-timezone"
                                    value={tenantForm.timeZone}
                                    onChange={(event) =>
                                        setTenantForm((current) => ({ ...current, timeZone: event.target.value }))
                                    }
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tenant-stores">Máximo de tiendas</Label>
                                <Input
                                    id="tenant-stores"
                                    type="number"
                                    min={1}
                                    value={tenantForm.maxStores}
                                    onChange={(event) =>
                                        setTenantForm((current) => ({
                                            ...current,
                                            maxStores: Number(event.target.value),
                                        }))
                                    }
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tenant-users">Máximo de usuarios</Label>
                                <Input
                                    id="tenant-users"
                                    type="number"
                                    min={1}
                                    value={tenantForm.maxUsers}
                                    onChange={(event) =>
                                        setTenantForm((current) => ({
                                            ...current,
                                            maxUsers: Number(event.target.value),
                                        }))
                                    }
                                    required
                                />
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="tenant-locale">Locale</Label>
                                <Input
                                    id="tenant-locale"
                                    value={tenantForm.locale}
                                    onChange={(event) =>
                                        setTenantForm((current) => ({ ...current, locale: event.target.value }))
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <DialogFooter className="border-t border-[#e5e7eb] px-6 py-4">
                            <button
                                type="button"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                                className="rounded-md border border-[#dfe2e7] px-4 py-2 text-sm font-semibold text-[#536174] hover:bg-[#f5f6f8] disabled:opacity-60"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0e5c3b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b4e32] disabled:opacity-60"
                            >
                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                {isSubmitting ? "Creando..." : "Crear y continuar"}
                            </button>
                        </DialogFooter>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleProvisionTenant}>
                        <div className="max-h-[60vh] space-y-6 overflow-y-auto px-6 py-5">
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                                <p className="text-xs font-bold text-amber-900">{tenantName}</p>
                                <p className="mt-1 break-all font-mono text-[9px] text-amber-700">{tenantID}</p>
                                <p className="mt-2 text-[10px] text-amber-800">
                                    El tenant permanecerá en PROVISIONING hasta completar esta operación.
                                </p>
                            </div>

                            <fieldset className="grid gap-4 sm:grid-cols-2">
                                <legend className="mb-3 text-xs font-extrabold text-[#122238]">
                                    Usuario administrador
                                </legend>

                                <div className="space-y-2">
                                    <Label htmlFor="admin-name">Nombre completo</Label>
                                    <Input
                                        id="admin-name"
                                        value={userForm.name}
                                        onChange={(event) =>
                                            setUserForm((current) => ({ ...current, name: event.target.value }))
                                        }
                                        placeholder="Administrador ACME"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="admin-email">Correo</Label>
                                    <Input
                                        id="admin-email"
                                        type="email"
                                        value={userForm.email}
                                        onChange={(event) =>
                                            setUserForm((current) => ({ ...current, email: event.target.value }))
                                        }
                                        placeholder="admin@acme.cl"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Rol</Label>
                                    <div className="flex h-10 items-center rounded-md border border-[#dfe2e7] bg-[#f8f9fb] px-3 text-sm">
                                        admin
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="admin-password">Contraseña inicial</Label>
                                    <Input
                                        id="admin-password"
                                        type="password"
                                        minLength={8}
                                        value={userForm.password}
                                        onChange={(event) =>
                                            setUserForm((current) => ({ ...current, password: event.target.value }))
                                        }
                                        placeholder="Mínimo 8 caracteres"
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>
                            </fieldset>

                            <fieldset className="grid gap-4 border-t border-[#e5e7eb] pt-5 sm:grid-cols-2">
                                <legend className="mb-3 text-xs font-extrabold text-[#122238]">
                                    Tienda central
                                </legend>

                                <div className="space-y-2">
                                    <Label htmlFor="store-name">Nombre</Label>
                                    <Input
                                        id="store-name"
                                        value={storeForm.name}
                                        onChange={(event) =>
                                            setStoreForm((current) => ({ ...current, name: event.target.value }))
                                        }
                                        placeholder="ACME Central"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="store-email">Correo</Label>
                                    <Input
                                        id="store-email"
                                        type="email"
                                        value={storeForm.email}
                                        onChange={(event) =>
                                            setStoreForm((current) => ({ ...current, email: event.target.value }))
                                        }
                                        placeholder="central@acme.cl"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="store-rut">RUT</Label>
                                    <Input
                                        id="store-rut"
                                        value={storeForm.rut}
                                        onChange={(event) =>
                                            setStoreForm((current) => ({ ...current, rut: event.target.value }))
                                        }
                                        placeholder="76283592-1"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="store-phone">Teléfono</Label>
                                    <Input
                                        id="store-phone"
                                        value={storeForm.phone}
                                        onChange={(event) =>
                                            setStoreForm((current) => ({ ...current, phone: event.target.value }))
                                        }
                                        placeholder="+56912345678"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="store-location">Comuna o sector</Label>
                                    <Input
                                        id="store-location"
                                        value={storeForm.location}
                                        onChange={(event) =>
                                            setStoreForm((current) => ({ ...current, location: event.target.value }))
                                        }
                                        placeholder="Providencia"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="store-city">Ciudad</Label>
                                    <Input
                                        id="store-city"
                                        value={storeForm.city}
                                        onChange={(event) =>
                                            setStoreForm((current) => ({ ...current, city: event.target.value }))
                                        }
                                        placeholder="Santiago"
                                        required
                                    />
                                </div>

                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="store-address">Dirección</Label>
                                    <Input
                                        id="store-address"
                                        value={storeForm.address}
                                        onChange={(event) =>
                                            setStoreForm((current) => ({ ...current, address: event.target.value }))
                                        }
                                        placeholder="Av. Principal 100"
                                        required
                                    />
                                </div>

                                <div className="flex items-center gap-3 rounded-md border border-[#dfe2e7] bg-[#f8f9fb] px-3 py-2 sm:col-span-2">
                                    <Check className="h-4 w-4 text-[#0e5c3b]" />
                                    <div>
                                        <p className="text-xs font-semibold">Tienda central</p>
                                        <p className="text-[10px] text-[#758296]">
                                            Se enviará type: central e isCentralStore: true.
                                        </p>
                                    </div>
                                </div>
                            </fieldset>

                            <fieldset className="grid gap-4 border-t border-[#e5e7eb] pt-5 sm:grid-cols-2">
                                <legend className="mb-1 text-xs font-extrabold text-[#122238]">
                                    Datos DTE opcionales
                                </legend>

                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="store-business-name">Razón social</Label>
                                    <Input
                                        id="store-business-name"
                                        value={storeForm.businessName}
                                        onChange={(event) =>
                                            setStoreForm((current) => ({
                                                ...current,
                                                businessName: event.target.value,
                                            }))
                                        }
                                        placeholder="COMERCIAL ACME SPA"
                                    />
                                </div>

                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="store-giro">Giro</Label>
                                    <Input
                                        id="store-giro"
                                        value={storeForm.giro}
                                        onChange={(event) =>
                                            setStoreForm((current) => ({ ...current, giro: event.target.value }))
                                        }
                                        placeholder="VENTA AL POR MENOR"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="store-acteco">ACTECO</Label>
                                    <Input
                                        id="store-acteco"
                                        value={storeForm.acteco}
                                        onChange={(event) =>
                                            setStoreForm((current) => ({ ...current, acteco: event.target.value }))
                                        }
                                        placeholder="477100"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="store-sii-code">Código sucursal SII</Label>
                                    <Input
                                        id="store-sii-code"
                                        value={storeForm.cdgSIISucur}
                                        onChange={(event) =>
                                            setStoreForm((current) => ({
                                                ...current,
                                                cdgSIISucur: event.target.value,
                                            }))
                                        }
                                        placeholder="0"
                                    />
                                </div>
                            </fieldset>
                        </div>

                        <DialogFooter className="border-t border-[#e5e7eb] px-6 py-4">
                            <button
                                type="button"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                                className="rounded-md border border-[#dfe2e7] px-4 py-2 text-sm font-semibold text-[#536174] hover:bg-[#f5f6f8] disabled:opacity-60"
                            >
                                Continuar después
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0e5c3b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b4e32] disabled:opacity-60"
                            >
                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                {isSubmitting ? "Provisionando..." : "Crear usuario y tienda"}
                            </button>
                        </DialogFooter>
                    </form>
                )}

                {step === 3 && result && (
                    <div>
                        <div className="px-6 py-8">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                <Check className="h-6 w-6" />
                            </div>
                            <h3 className="mt-4 text-center text-base font-extrabold text-[#122238]">
                                Tenant activo
                            </h3>
                            <p className="mt-1 text-center text-xs text-[#758296]">{result.message}</p>

                            <dl className="mt-6 grid gap-3 rounded-lg border border-[#dfe2e7] bg-[#f8f9fb] p-4 text-xs">
                                <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
                                    <dt className="font-semibold text-[#536174]">Tenant ID</dt>
                                    <dd className="break-all font-mono text-[#122238]">{result.tenantID}</dd>
                                </div>
                                <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
                                    <dt className="font-semibold text-[#536174]">Tienda central ID</dt>
                                    <dd className="break-all font-mono text-[#122238]">{result.centralStoreID}</dd>
                                </div>
                                <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
                                    <dt className="font-semibold text-[#536174]">Administrador ID</dt>
                                    <dd className="break-all font-mono text-[#122238]">{result.adminUserID}</dd>
                                </div>
                                <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
                                    <dt className="font-semibold text-[#536174]">Estado</dt>
                                    <dd className="font-bold text-emerald-700">{result.status}</dd>
                                </div>
                            </dl>
                        </div>

                        <DialogFooter className="border-t border-[#e5e7eb] px-6 py-4">
                            <button
                                type="button"
                                onClick={() => onOpenChange(false)}
                                className="rounded-md bg-[#0e5c3b] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0b4e32]"
                            >
                                Finalizar
                            </button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
