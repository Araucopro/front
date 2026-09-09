"use client"

import { FormEvent, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react"
import { updateUser } from "@/actions/users/updateUser"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ITenantRole } from "@/interfaces/roles/IRole"
import type { IUser } from "@/interfaces/users/IUser"
import { buildUserRolePayload, getRoleAssignmentValue, getRoleDisplayName, LEGACY_ROLE_OPTIONS } from "@/lib/role-helpers"
import { Role } from "@/lib/userRoles"
import { cn } from "@/lib/utils"
import {
    BadgePercent,
    BriefcaseBusiness,
    CalendarDays,
    CheckCircle2,
    CheckSquare,
    ClipboardList,
    Folder,
    KeyRound,
    LockKeyhole,
    Plus,
    TriangleAlert,
    User,
} from "lucide-react"
import { toast } from "sonner"

type WorkerDetailTab = "personal" | "contract" | "access" | "permissions" | "discounts" | "history" | "hr"

type WorkerDetailDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: IUser | null
    roles: ITenantRole[]
    onSaved: () => Promise<void> | void
}

type RoleOption = {
    value: string
    label: string
    details: string
    permissionSubjects: string[]
}

type ModuleOption = {
    key: string
    label: string
}

type PermissionOption = {
    key: string
    label: string
    description: string
    group: string
    badge?: string
}

type HistoryEvent = {
    id: string
    type: string
    title: string
    detail: string
    date: string
}

const tabs: Array<{ id: WorkerDetailTab; label: string; icon: ComponentType<{ className?: string }> }> = [
    { id: "personal", label: "Personal", icon: User },
    { id: "contract", label: "Contrato", icon: ClipboardList },
    { id: "access", label: "Acceso", icon: LockKeyhole },
    { id: "permissions", label: "Permisos", icon: CheckSquare },
    { id: "discounts", label: "Descuentos", icon: BadgePercent },
    { id: "history", label: "Historial", icon: Folder },
    { id: "hr", label: "RRHH", icon: BriefcaseBusiness },
]

const moduleOptions: ModuleOption[] = [
    { key: "sales", label: "Caja" },
    { key: "inventory", label: "Inventario" },
    { key: "commercial", label: "Comercial" },
    { key: "expenses", label: "Egresos" },
    { key: "kpis", label: "KPI's" },
    { key: "results", label: "Estado de Resultados" },
    { key: "prebalance", label: "Pre-Balance" },
    { key: "config", label: "Configuracion" },
]

const moduleSubjectMap: Record<string, string> = {
    sales: "sales",
    sale: "sales",
    caja: "sales",
    quotes: "commercial",
    quote: "commercial",
    products: "inventory",
    product: "inventory",
    inventory: "inventory",
    storeproduct: "inventory",
    expenses: "expenses",
    expense: "expenses",
    reports: "results",
    report: "results",
    incomestatement: "results",
    users: "config",
    user: "config",
    roles: "config",
    stores: "config",
}

const fallbackModulesByRole = new Map<string, string[]>([
    [Role.Admin, ["sales", "inventory", "commercial", "expenses", "kpis", "results", "prebalance", "config"]],
    [Role.Vendedor, ["sales", "inventory", "commercial"]],
    [Role.Consignado, ["sales", "inventory"]],
    [Role.Tercero, ["commercial"]],
])

const permissions: PermissionOption[] = [
    {
        key: "manual-discount",
        label: "Aplicar descuento en venta",
        description: "Puede usar el chip de descuento en el POS hasta su tope autorizado",
        group: "Ventas y caja",
    },
    {
        key: "void-ticket",
        label: "Solicitar anulacion de boleta",
        description: "Admin o Gerente deben autorizar y queda registro en el diario",
        group: "Ventas y caja",
        badge: "Admin autoriza",
    },
    {
        key: "create-quotes",
        label: "Crear cotizaciones y notas de venta",
        description: "Acceso a Comercial, Cotizaciones y Notas de Venta",
        group: "Ventas y caja",
    },
    {
        key: "stock-loss",
        label: "Registrar mermas, robos y perdidas",
        description: "Puede ingresar el registro. Gerente autoriza y toma decision final",
        group: "Inventario",
        badge: "Gerente autoriza",
    },
    {
        key: "create-expenses",
        label: "Ingresar egresos",
        description: "Puede registrar gastos. Admin edita/autoriza, Gerente cambia estado final",
        group: "Egresos y reportes",
    },
    {
        key: "export-reports",
        label: "Exportar e imprimir informes",
        description: "Puede descargar reportes en PDF o Excel",
        group: "Egresos y reportes",
    },
    {
        key: "delete-records",
        label: "Borrar registros",
        description: "Puede eliminar datos. Uso con precaucion.",
        group: "Egresos y reportes",
        badge: "Solo Admin+",
    },
]

const contractTypes = ["Contrato laboral (liquidacion)", "Honorarios", "Practica", "Servicio externo"]
const contractDurations = ["Indefinido", "Plazo fijo", "Por obra o faena"]
const workdayTypes = ["Jornada completa", "Media jornada", "Turnos", "Part-time"]
const healthTypes = ["Fonasa", "Isapre (cotizacion variable)"]
const healthProviders = ["Sin proveedor", "Banmedica", "Colmena", "Consalud", "Cruz Blanca"]
const pensionFunds = ["AFP Capital", "AFP Cuprum (com. 1.44%)", "AFP Habitat", "AFP Modelo", "AFP Provida"]
const mutuals = ["ACHS (0.90%)", "IST", "Mutual de Seguridad"]
const gratuityOptions = ["Absorcion - incluida en sueldo base", "Pago separado", "No aplica"]

const unique = <T,>(items: T[]) => Array.from(new Set(items))

const toDateInput = (value?: string | null) => {
    if (!value) return ""
    return value.slice(0, 10)
}

const getInitialRoleValue = (user: IUser | null, roles: ITenantRole[]) => {
    if (!user) return ""
    if (user.roleID) return user.roleID
    const role = roles.find((item) => item.name.toLowerCase() === user.role?.toLowerCase() || item.systemKey?.toLowerCase() === user.role?.toLowerCase())
    return role ? getRoleAssignmentValue(role) : user.role
}

const getRoleDetails = (subjects: string[]) => {
    const modules = unique(subjects.map((subject) => moduleSubjectMap[subject.toLowerCase()] ?? subject).filter(Boolean))
    if (modules.length === 0) return "Acceso segun perfil"

    return modules
        .slice(0, 3)
        .map((key) => moduleOptions.find((module) => module.key === key)?.label ?? key)
        .join(", ")
}

const getInitials = (name?: string, email?: string) => {
    const source = (name || email || "US").trim()
    const words = source.split(/\s+/).filter(Boolean)
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

export default function HumanResourcesWorkerDetailDialog({
    open,
    onOpenChange,
    user,
    roles,
    onSaved,
}: WorkerDetailDialogProps) {
    const [activeTab, setActiveTab] = useState<WorkerDetailTab>("personal")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [personalData, setPersonalData] = useState({
        name: "",
        rut: "",
        birthDate: "",
        phone: "",
        email: "",
        address: "",
    })
    const [contractData, setContractData] = useState({
        startDate: "",
        contractType: contractTypes[0],
        contractDuration: contractDurations[0],
        workdayType: workdayTypes[0],
        weeklyHours: "42",
        healthType: healthTypes[0],
        healthProvider: healthProviders[0],
        pensionFund: pensionFunds[0],
        mutual: mutuals[0],
        gratuity: gratuityOptions[0],
    })
    const [accessData, setAccessData] = useState({
        roleValue: "",
        password: "",
    })
    const [extraModules, setExtraModules] = useState<string[]>([])
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>(() => permissions.map((permission) => permission.key))
    const [discountPercent, setDiscountPercent] = useState(0)
    const [discountLimit, setDiscountLimit] = useState("0")
    const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([])
    const [historyDraft, setHistoryDraft] = useState({ type: "Felicitacion", title: "", detail: "" })

    const roleOptions = useMemo<RoleOption[]>(() => {
        const tenantOptions = roles.map((role) => {
            const subjects = role.permissions
                .map((permission) => permission.permission?.subject ?? permission.permissionKey.split(":")[0])
                .filter((subject): subject is string => Boolean(subject))

            return {
                value: getRoleAssignmentValue(role),
                label: getRoleDisplayName(role),
                details: getRoleDetails(subjects),
                permissionSubjects: subjects,
            }
        })

        const options =
            tenantOptions.length > 0
                ? tenantOptions
                : LEGACY_ROLE_OPTIONS.map((role) => ({
                      value: role.value,
                      label: role.label,
                      details: getRoleDetails(fallbackModulesByRole.get(role.value) ?? []),
                      permissionSubjects: fallbackModulesByRole.get(role.value) ?? [],
                  }))

        return Array.from(new Map(options.map((option) => [option.value, option])).values())
    }, [roles])

    const selectedRole = roleOptions.find((role) => role.value === accessData.roleValue)

    const baseModules = useMemo(() => {
        if (!selectedRole) return []

        const modulesFromPermissions = selectedRole.permissionSubjects
            .map((subject) => moduleSubjectMap[subject.toLowerCase()] ?? subject)
            .filter((key) => moduleOptions.some((module) => module.key === key))

        if (modulesFromPermissions.length > 0) return unique(modulesFromPermissions)
        return fallbackModulesByRole.get(selectedRole.value) ?? []
    }, [selectedRole])

    const selectedModuleKeys = useMemo(() => unique([...baseModules, ...extraModules]), [baseModules, extraModules])

    useEffect(() => {
        if (!user || !open) return

        setActiveTab("personal")
        setPersonalData({
            name: user.name ?? "",
            rut: "",
            birthDate: "",
            phone: user.phone ?? "",
            email: user.email ?? "",
            address: "",
        })
        setContractData({
            startDate: toDateInput(user.createdAt),
            contractType: contractTypes[0],
            contractDuration: contractDurations[0],
            workdayType: workdayTypes[0],
            weeklyHours: "42",
            healthType: healthTypes[0],
            healthProvider: healthProviders[0],
            pensionFund: pensionFunds[0],
            mutual: mutuals[0],
            gratuity: gratuityOptions[0],
        })
        setAccessData({
            roleValue: getInitialRoleValue(user, roles),
            password: "",
        })
        setExtraModules([])
        setSelectedPermissions(permissions.map((permission) => permission.key))
        setDiscountPercent(0)
        setDiscountLimit("0")
        setHistoryEvents([
            {
                id: "initial",
                type: "Inicio",
                title: "Inicio de relacion laboral",
                detail: "Evento inicial generado por el sistema.",
                date: toDateInput(user.createdAt) || new Date().toISOString().slice(0, 10),
            },
        ])
        setHistoryDraft({ type: "Felicitacion", title: "", detail: "" })
    }, [open, roles, user])

    const updatePersonalData = (field: keyof typeof personalData, value: string) => {
        setPersonalData((current) => ({ ...current, [field]: value }))
    }

    const updateContractData = (field: keyof typeof contractData, value: string) => {
        setContractData((current) => ({ ...current, [field]: value }))
    }

    const toggleExtraModule = (moduleKey: string) => {
        if (baseModules.includes(moduleKey)) return
        setExtraModules((current) =>
            current.includes(moduleKey) ? current.filter((key) => key !== moduleKey) : [...current, moduleKey],
        )
    }

    const togglePermission = (permissionKey: string, checked: boolean) => {
        setSelectedPermissions((current) =>
            checked ? unique([...current, permissionKey]) : current.filter((key) => key !== permissionKey),
        )
    }

    const addHistoryEvent = () => {
        if (!historyDraft.title.trim()) {
            toast.error("Ingresa un titulo para el evento")
            return
        }

        setHistoryEvents((current) => [
            ...current,
            {
                id: `${Date.now()}`,
                type: historyDraft.type,
                title: historyDraft.title.trim(),
                detail: historyDraft.detail.trim() || "Sin detalle adicional.",
                date: new Date().toISOString().slice(0, 10),
            },
        ])
        setHistoryDraft({ type: historyDraft.type, title: "", detail: "" })
        toast.info("Evento agregado en mock hasta conectar historial RH")
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!user) return

        if (!personalData.name.trim()) {
            setActiveTab("personal")
            toast.error("El nombre del trabajador es obligatorio")
            return
        }

        if (!accessData.roleValue) {
            setActiveTab("access")
            toast.error("Selecciona un rol base")
            return
        }

        setIsSubmitting(true)
        try {
            await updateUser(user.userID, {
                name: personalData.name.trim(),
                ...buildUserRolePayload(accessData.roleValue),
                ...(accessData.password.trim() ? { password: accessData.password.trim() } : {}),
            })
            toast.success("Trabajador actualizado")
            toast.info("Los datos laborales/RH siguen como mock hasta conectar los endpoints del ticket 2")
            await onSaved()
            onOpenChange(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo actualizar el trabajador")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!user) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="left-auto right-0 top-0 h-screen max-h-screen w-[min(720px,100vw)] max-w-none translate-x-0 translate-y-0 rounded-none border-l border-slate-200 dark:border-slate-700">
                <form className="flex h-full flex-col" onSubmit={handleSubmit}>
                    <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
                        <DialogTitle className="flex items-center gap-3 text-base font-semibold text-slate-950 dark:text-white">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sm font-black text-slate-700 dark:bg-slate-700 dark:text-white">
                                {getInitials(personalData.name, personalData.email)}
                            </span>
                            {personalData.name || "Trabajador"}
                        </DialogTitle>
                        <DialogDescription className="sr-only">Detalle editable del trabajador de Recursos Humanos</DialogDescription>
                    </DialogHeader>

                    <div className="border-b border-slate-200 dark:border-slate-700">
                        <div className="flex overflow-x-auto px-4">
                            {tabs.map((tab) => {
                                const Icon = tab.icon
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "flex min-w-max items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                                            activeTab === tab.id
                                                ? "border-slate-700 text-slate-900 dark:border-white dark:text-white"
                                                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                                        )}
                                    >
                                        <Icon className="h-4 w-4 text-violet-600" />
                                        {tab.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-6">
                        {activeTab === "personal" && (
                            <div className="space-y-8">
                                <SectionTitle>Identificacion</SectionTitle>
                                <div className="grid gap-5 md:grid-cols-2">
                                    <Field label="Nombre completo">
                                        <Input value={personalData.name} onChange={(event) => updatePersonalData("name", event.target.value)} />
                                    </Field>
                                    <Field label="RUT">
                                        <Input value={personalData.rut} onChange={(event) => updatePersonalData("rut", event.target.value)} />
                                    </Field>
                                    <Field label="Fecha de nacimiento">
                                        <Input type="date" value={personalData.birthDate} onChange={(event) => updatePersonalData("birthDate", event.target.value)} />
                                    </Field>
                                    <Field label="Telefono">
                                        <Input value={personalData.phone} onChange={(event) => updatePersonalData("phone", event.target.value)} />
                                    </Field>
                                </div>

                                <Separator />
                                <SectionTitle>Contacto</SectionTitle>
                                <div className="space-y-5">
                                    <Field label="Email">
                                        <Input type="email" value={personalData.email} onChange={(event) => updatePersonalData("email", event.target.value)} />
                                    </Field>
                                    <Field label="Domicilio personal">
                                        <Input value={personalData.address} onChange={(event) => updatePersonalData("address", event.target.value)} />
                                    </Field>
                                </div>
                            </div>
                        )}

                        {activeTab === "contract" && (
                            <div className="space-y-8">
                                <SectionTitle>Datos del contrato</SectionTitle>
                                <div className="grid gap-5 md:grid-cols-2">
                                    <Field label="Fecha de ingreso">
                                        <Input type="date" value={contractData.startDate} onChange={(event) => updateContractData("startDate", event.target.value)} />
                                    </Field>
                                    <SelectField label="Tipo de contrato" value={contractData.contractType} options={contractTypes} onValueChange={(value) => updateContractData("contractType", value)} />
                                    <SelectField label="Duracion del contrato" value={contractData.contractDuration} options={contractDurations} onValueChange={(value) => updateContractData("contractDuration", value)} />
                                    <div />
                                    <SelectField label="Jornada laboral" value={contractData.workdayType} options={workdayTypes} onValueChange={(value) => updateContractData("workdayType", value)} />
                                    <Field label="Horas semanales (1-56)">
                                        <Input type="number" min={1} max={56} value={contractData.weeklyHours} onChange={(event) => updateContractData("weeklyHours", event.target.value)} />
                                        <p className="mt-2 text-xs text-slate-500">Ordinaria max. 42 h. Con HH.EE.: tope 56 h.</p>
                                    </Field>
                                </div>

                                <Separator />
                                <SectionTitle>Prevision</SectionTitle>
                                <div className="grid gap-5 md:grid-cols-2">
                                    <SelectField label="Prevision de salud" value={contractData.healthType} options={healthTypes} onValueChange={(value) => updateContractData("healthType", value)} />
                                    <SelectField label="Fondo de pension (AFP)" value={contractData.pensionFund} options={pensionFunds} onValueChange={(value) => updateContractData("pensionFund", value)} />
                                    <SelectField label="Proveedor de salud" value={contractData.healthProvider} options={healthProviders} onValueChange={(value) => updateContractData("healthProvider", value)} />
                                    <div />
                                    <SelectField label="Mutual de seguridad" value={contractData.mutual} options={mutuals} onValueChange={(value) => updateContractData("mutual", value)} />
                                    <SelectField label="Gratificacion legal" value={contractData.gratuity} options={gratuityOptions} onValueChange={(value) => updateContractData("gratuity", value)} />
                                </div>
                            </div>
                        )}

                        {activeTab === "access" && (
                            <div className="space-y-7">
                                <SectionTitle>Rol base</SectionTitle>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {roleOptions.map((role, index) => {
                                        const selected = accessData.roleValue === role.value
                                        return (
                                            <button
                                                key={`${role.value}-${index}`}
                                                type="button"
                                                onClick={() => setAccessData((current) => ({ ...current, roleValue: role.value }))}
                                                className={cn(
                                                    "min-h-18 rounded-lg border px-4 py-3 text-center transition-colors",
                                                    selected
                                                        ? "border-slate-800 bg-slate-50 text-slate-950 dark:border-slate-100 dark:bg-slate-700 dark:text-white"
                                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
                                                )}
                                            >
                                                <span className="block text-xs font-black">{role.label}</span>
                                                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-300">{role.details}</span>
                                            </button>
                                        )
                                    })}
                                </div>

                                <Field label="Nueva clave opcional">
                                    <div className="relative max-w-sm">
                                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            type="password"
                                            value={accessData.password}
                                            onChange={(event) => setAccessData((current) => ({ ...current, password: event.target.value }))}
                                            placeholder="Dejar vacio para no cambiar"
                                            className="pl-9"
                                        />
                                    </div>
                                </Field>

                                <div>
                                    <SectionTitle>Modulos accesibles</SectionTitle>
                                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                                        Los modulos del rol base estan marcados. Puedes agregar modulos extra para este usuario especifico.
                                    </p>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        {moduleOptions.map((module) => {
                                            const isBase = baseModules.includes(module.key)
                                            const isSelected = selectedModuleKeys.includes(module.key)
                                            return (
                                                <button
                                                    key={module.key}
                                                    type="button"
                                                    onClick={() => toggleExtraModule(module.key)}
                                                    className={cn(
                                                        "flex min-h-10 items-center justify-between rounded-lg border px-4 py-2 text-left text-sm font-semibold transition-colors",
                                                        isBase
                                                            ? "border-sky-200 bg-sky-50 text-slate-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100"
                                                            : isSelected
                                                              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                                                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
                                                    )}
                                                >
                                                    {module.label}
                                                    {isBase && <span className="text-[10px] font-black uppercase">Rol base</span>}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "permissions" && (
                            <div className="space-y-6">
                                <p className="text-sm text-slate-500 dark:text-slate-300">
                                    Permisos adicionales sobre el perfil base del rol. Se activan individualmente para este usuario.
                                </p>
                                {["Ventas y caja", "Inventario", "Egresos y reportes"].map((group) => (
                                    <div key={group} className="space-y-3">
                                        <SectionTitle>{group}</SectionTitle>
                                        {permissions
                                            .filter((permission) => permission.group === group)
                                            .map((permission) => (
                                                <div key={permission.key} className="flex items-center justify-between gap-3 border-t border-slate-100 py-3 dark:border-slate-800">
                                                    <div className="flex items-start gap-3">
                                                        <Checkbox
                                                            checked={selectedPermissions.includes(permission.key)}
                                                            onCheckedChange={(value) => togglePermission(permission.key, value === true)}
                                                            className="mt-1"
                                                        />
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{permission.label}</p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-300">{permission.description}</p>
                                                        </div>
                                                    </div>
                                                    {permission.badge && <Badge className="bg-sky-50 text-slate-700 hover:bg-sky-50">{permission.badge}</Badge>}
                                                </div>
                                            ))}
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === "discounts" && (
                            <div className="space-y-7">
                                <p className="text-sm text-slate-500 dark:text-slate-300">
                                    Define hasta que porcentaje puede aplicar este usuario en una venta. Los descuentos pre-configurados se aplican automaticamente.
                                </p>
                                <div className="rounded-lg border border-slate-200 p-5 dark:border-slate-700">
                                    <SectionTitle>Descuento maximo autorizado</SectionTitle>
                                    <div className="mt-5 text-center text-3xl font-black text-slate-700 dark:text-white">
                                        {discountPercent} <span className="text-base font-bold">%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={25}
                                        step={1}
                                        value={discountPercent}
                                        onChange={(event) => setDiscountPercent(Number(event.target.value))}
                                        className="mt-4 w-full accent-slate-700"
                                    />
                                    <div className="mt-2 flex justify-between text-xs text-slate-400">
                                        <span>Sin descuento</span>
                                        <span>5%</span>
                                        <span>10%</span>
                                        <span>15%</span>
                                        <span>20%</span>
                                        <span>25%</span>
                                    </div>
                                    <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-300">
                                        Equivale a <span className="font-bold text-emerald-700">${Math.round(36538 * (discountPercent / 100)).toLocaleString("es-CL")}</span> sobre el ticket promedio de la tienda ($36.538)
                                    </p>
                                </div>

                                <Field label="Tope en monto fijo">
                                    <Input value={discountLimit} onChange={(event) => setDiscountLimit(event.target.value)} />
                                </Field>
                                <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4" />
                                    Si se define tanto porcentaje como monto fijo, el sistema aplicara el mayor beneficio dentro del tope autorizado.
                                </div>
                            </div>
                        )}

                        {activeTab === "history" && (
                            <div className="space-y-6">
                                <SectionTitle>{historyEvents.length} evento registrado</SectionTitle>
                                <div className="space-y-4 border-l-2 border-emerald-200 pl-4">
                                    {historyEvents.map((event) => (
                                        <div key={event.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{event.type}</Badge>
                                                <p className="font-bold text-slate-950 dark:text-white">{event.title}</p>
                                            </div>
                                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{event.detail}</p>
                                            <p className="mt-2 text-xs text-slate-500">{event.date} registrado por Sistema</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-lg border border-dashed border-slate-200 p-4 dark:border-slate-700">
                                    <SectionTitle>Agregar evento al historial</SectionTitle>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {["Felicitacion", "Actualizacion", "Falta", "Reclamo", "Desvinculacion"].map((type) => (
                                            <Button
                                                key={type}
                                                type="button"
                                                variant={historyDraft.type === type ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setHistoryDraft((current) => ({ ...current, type }))}
                                            >
                                                {type}
                                            </Button>
                                        ))}
                                    </div>
                                    <div className="mt-5 space-y-5">
                                        <Field label="Titulo del evento">
                                            <Input
                                                value={historyDraft.title}
                                                onChange={(event) => setHistoryDraft((current) => ({ ...current, title: event.target.value }))}
                                                placeholder="Ej: Reconocimiento por desempeno"
                                            />
                                        </Field>
                                        <Field label="Detalle">
                                            <Textarea
                                                value={historyDraft.detail}
                                                onChange={(event) => setHistoryDraft((current) => ({ ...current, detail: event.target.value }))}
                                                placeholder="Descripcion adicional del evento..."
                                            />
                                        </Field>
                                        <Button type="button" className="bg-slate-700 text-white hover:bg-slate-800" onClick={addHistoryEvent}>
                                            <Plus className="h-4 w-4" />
                                            Registrar evento
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "hr" && (
                            <div className="space-y-7">
                                <SectionTitle>Vacaciones legales</SectionTitle>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <MetricCard label="Dias acumulados" value="0" className="border-emerald-200 bg-emerald-50 text-emerald-900" />
                                    <MetricCard label="Tomados este ano" value="0" className="border-amber-200 bg-amber-50 text-amber-900" />
                                    <MetricCard label="Disponibles" value="0" className="border-sky-200 bg-sky-50 text-sky-900" />
                                </div>

                                <div>
                                    <SectionTitle>Solicitudes RRHH</SectionTitle>
                                    <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">Sin solicitudes registradas.</p>
                                    <Button type="button" className="mt-4 w-full bg-emerald-900 text-white hover:bg-emerald-950">
                                        Registrar solicitud del trabajador
                                    </Button>
                                    <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                        <TriangleAlert className="mt-0.5 h-4 w-4" />
                                        Cada solicitud aprobada debe ser conversada internamente antes de su resolucion.
                                    </div>
                                </div>

                                <Separator />
                                <div>
                                    <div className="flex items-center justify-between">
                                        <SectionTitle>Conceptos de liquidacion del mes</SectionTitle>
                                        <Button type="button" variant="outline" size="sm">
                                            <Plus className="h-4 w-4" />
                                            Agregar
                                        </Button>
                                    </div>
                                    <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">Sin conceptos registrados este mes.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                        <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={isSubmitting}>
                                Cancelar
                            </Button>
                        </DialogClose>
                        <Button type="submit" className="bg-slate-700 text-white hover:bg-slate-800" disabled={isSubmitting}>
                            {isSubmitting ? "Guardando..." : "Guardar cambios"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
    return (
        <div className={className}>
            <Label className="mb-2 block text-xs font-black uppercase text-slate-500 dark:text-slate-300">{label}</Label>
            {children}
        </div>
    )
}

function SelectField({
    label,
    value,
    options,
    onValueChange,
}: {
    label: string
    value: string
    options: string[]
    onValueChange: (value: string) => void
}) {
    return (
        <Field label={label}>
            <Select value={value} onValueChange={onValueChange}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option} value={option}>
                            {option}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </Field>
    )
}

function SectionTitle({ children }: { children: ReactNode }) {
    return <p className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">{children}</p>
}

function Separator() {
    return <div className="border-t border-slate-200 dark:border-slate-700" />
}

function MetricCard({ label, value, className }: { label: string; value: string; className?: string }) {
    return (
        <div className={cn("rounded-lg border p-4 text-center", className)}>
            <p className="text-3xl font-black">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{label}</p>
        </div>
    )
}
