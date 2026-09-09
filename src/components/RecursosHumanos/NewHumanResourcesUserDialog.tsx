"use client"

import { FormEvent, useMemo, useState } from "react"
import { addUserStore } from "@/actions/stores/addUserStore"
import { createUser } from "@/actions/users/createUser"
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
import type { IStore } from "@/interfaces/stores/IStore"
import { buildUserRolePayload, getRoleAssignmentValue, getRoleDisplayName, LEGACY_ROLE_OPTIONS } from "@/lib/role-helpers"
import { Role } from "@/lib/userRoles"
import { cn } from "@/lib/utils"
import {
    BadgePercent,
    BarChart3,
    BriefcaseBusiness,
    CalendarDays,
    CheckSquare,
    ClipboardList,
    FileBarChart,
    FileText,
    Home,
    KeyRound,
    LockKeyhole,
    Package,
    Settings,
    ShieldCheck,
    User,
    UserPlus,
} from "lucide-react"
import { toast } from "sonner"

type NewUserTab = "personal" | "access" | "permissions" | "discounts" | "history"

type NewHumanResourcesUserDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    roles: ITenantRole[]
    stores: IStore[]
    onCreated: () => Promise<void> | void
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
    icon: React.ComponentType<{ className?: string }>
}

type PermissionOption = {
    key: string
    label: string
    group: string
    authorizer?: string
}

const tabs: Array<{ id: NewUserTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "personal", label: "Datos personales", icon: User },
    { id: "access", label: "Acceso y modulos", icon: LockKeyhole },
    { id: "permissions", label: "Permisos", icon: CheckSquare },
    { id: "discounts", label: "Descuentos", icon: BadgePercent },
    { id: "history", label: "Historial", icon: ClipboardList },
]

const moduleOptions: ModuleOption[] = [
    { key: "sales", label: "Caja", icon: Home },
    { key: "inventory", label: "Inventario", icon: Package },
    { key: "commercial", label: "Comercial", icon: FileText },
    { key: "expenses", label: "Egresos", icon: BadgePercent },
    { key: "kpis", label: "KPI's", icon: BarChart3 },
    { key: "results", label: "Resultados", icon: FileBarChart },
    { key: "prebalance", label: "Pre-Balance", icon: BriefcaseBusiness },
    { key: "config", label: "Config", icon: Settings },
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
    incomeStatement: "results",
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
    { key: "manual-discount", label: "Aplicar descuento manual", group: "Ventas y caja" },
    { key: "void-ticket", label: "Solicitar anulacion boleta", group: "Ventas y caja", authorizer: "Admin" },
    { key: "create-quotes", label: "Crear cotizaciones", group: "Ventas y caja" },
    { key: "stock-loss", label: "Registrar mermas", group: "Inventario" },
    { key: "create-expenses", label: "Ingresar egresos", group: "Egresos y reportes" },
    { key: "export-reports", label: "Exportar informes", group: "Egresos y reportes" },
    { key: "delete-records", label: "Borrar registros", group: "Egresos y reportes", authorizer: "Gerente" },
]

const contractTypes = ["Indefinido", "Plazo fijo", "Por obra o faena", "Honorarios"]
const workdayTypes = ["Jornada completa", "Media jornada", "Turnos", "Part-time"]

const getTodayValue = () => {
    const date = new Date()
    const offset = date.getTimezoneOffset()
    return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

const isLegacyRoleValue = (value: string) => LEGACY_ROLE_OPTIONS.some((role) => role.value === value)

const getStoreRoleFromUserRole = (value: string) => {
    if (value === Role.Admin) return "owner"
    if (value === Role.Vendedor) return "store_manager"
    if (value === Role.Consignado) return "consignado"
    if (value === Role.Tercero) return "tercero"
    return undefined
}

const unique = <T,>(items: T[]) => Array.from(new Set(items))

const getRoleDetails = (subjects: string[]) => {
    const modules = unique(subjects.map((subject) => moduleSubjectMap[subject] ?? subject).filter(Boolean))
    if (modules.length === 0) return "Acceso segun rol"

    return modules
        .slice(0, 3)
        .map((key) => moduleOptions.find((module) => module.key === key)?.label.toLowerCase() ?? key)
        .join(", ")
}

export default function NewHumanResourcesUserDialog({
    open,
    onOpenChange,
    roles,
    stores,
    onCreated,
}: NewHumanResourcesUserDialogProps) {
    const [activeTab, setActiveTab] = useState<NewUserTab>("personal")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [personalData, setPersonalData] = useState({
        name: "",
        rut: "",
        address: "",
        email: "",
        phone: "",
        startDate: getTodayValue(),
        birthDate: "",
        contractType: contractTypes[0],
        workdayType: workdayTypes[0],
        weeklyHours: "42",
    })
    const [accessData, setAccessData] = useState({
        roleValue: "",
        password: "",
    })
    const [selectedStores, setSelectedStores] = useState<string[]>([])
    const [extraModules, setExtraModules] = useState<string[]>([])
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
    const [discountPercent, setDiscountPercent] = useState(0)
    const [discountLimit, setDiscountLimit] = useState("")
    const [historyNote, setHistoryNote] = useState("")

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
            .map((subject) => moduleSubjectMap[subject] ?? subject)
            .filter((key) => moduleOptions.some((module) => module.key === key))

        if (modulesFromPermissions.length > 0) return unique(modulesFromPermissions)
        if (isLegacyRoleValue(selectedRole.value)) return fallbackModulesByRole.get(selectedRole.value) ?? []
        return []
    }, [selectedRole])

    const selectedModuleKeys = useMemo(() => unique([...baseModules, ...extraModules]), [baseModules, extraModules])

    const updatePersonalData = (field: keyof typeof personalData, value: string) => {
        setPersonalData((current) => ({ ...current, [field]: value }))
    }

    const toggleStore = (storeID: string, checked: boolean) => {
        setSelectedStores((current) => (checked ? unique([...current, storeID]) : current.filter((id) => id !== storeID)))
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

    const resetForm = () => {
        setActiveTab("personal")
        setPersonalData({
            name: "",
            rut: "",
            address: "",
            email: "",
            phone: "",
            startDate: getTodayValue(),
            birthDate: "",
            contractType: contractTypes[0],
            workdayType: workdayTypes[0],
            weeklyHours: "42",
        })
        setAccessData({ roleValue: "", password: "" })
        setSelectedStores([])
        setExtraModules([])
        setSelectedPermissions([])
        setDiscountPercent(0)
        setDiscountLimit("")
        setHistoryNote("")
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!personalData.name.trim() || !personalData.rut.trim() || !personalData.email.trim() || !personalData.startDate) {
            setActiveTab("personal")
            toast.error("Completa los datos personales obligatorios")
            return
        }

        if (!accessData.roleValue || accessData.password.length < 6) {
            setActiveTab("access")
            toast.error("Selecciona un rol base y una clave de al menos 6 caracteres")
            return
        }

        setIsSubmitting(true)
        try {
            const createdUser = await createUser({
                name: personalData.name.trim(),
                email: personalData.email.trim(),
                password: accessData.password,
                ...buildUserRolePayload(accessData.roleValue),
            })

            const storeRole = getStoreRoleFromUserRole(accessData.roleValue)
            if (createdUser.userID && selectedStores.length > 0) {
                await Promise.all(selectedStores.map((storeID) => addUserStore(createdUser.userID, storeID, storeRole)))
            }

            toast.success("Usuario creado exitosamente")
            if (
                personalData.rut ||
                personalData.address ||
                personalData.birthDate ||
                selectedPermissions.length > 0 ||
                discountPercent > 0 ||
                historyNote.trim()
            ) {
                toast.info("Los datos propios de RRHH quedaron como mock hasta tener contrato de backend")
            }
            resetForm()
            onOpenChange(false)
            await onCreated()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo crear el usuario")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
                        <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                            <UserPlus className="h-4 w-4 text-violet-600" />
                            Nuevo Usuario
                        </DialogTitle>
                        <DialogDescription className="sr-only">Formulario de creacion de usuario para Recursos Humanos</DialogDescription>
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

                    <div className="max-h-[62vh] overflow-y-auto px-6 py-5">
                        {activeTab === "personal" && (
                            <div className="grid gap-5 md:grid-cols-2">
                                <Field label="Nombre completo *">
                                    <Input
                                        value={personalData.name}
                                        onChange={(event) => updatePersonalData("name", event.target.value)}
                                        placeholder="Nombre y apellido"
                                    />
                                </Field>
                                <Field label="RUT *">
                                    <Input
                                        value={personalData.rut}
                                        onChange={(event) => updatePersonalData("rut", event.target.value)}
                                        placeholder="12.345.678-9"
                                    />
                                </Field>
                                <Field label="Domicilio personal" className="md:col-span-2">
                                    <Input
                                        value={personalData.address}
                                        onChange={(event) => updatePersonalData("address", event.target.value)}
                                        placeholder="Calle, numero, ciudad"
                                    />
                                </Field>
                                <Field label="Email *">
                                    <Input
                                        type="email"
                                        value={personalData.email}
                                        onChange={(event) => updatePersonalData("email", event.target.value)}
                                        placeholder="correo@empresa.cl"
                                    />
                                </Field>
                                <Field label="Telefono">
                                    <Input
                                        value={personalData.phone}
                                        onChange={(event) => updatePersonalData("phone", event.target.value)}
                                        placeholder="+56 9 XXXX XXXX"
                                    />
                                </Field>
                                <Field label="Fecha de inicio *">
                                    <Input
                                        type="date"
                                        value={personalData.startDate}
                                        onChange={(event) => updatePersonalData("startDate", event.target.value)}
                                    />
                                </Field>
                                <Field label="Fecha de nacimiento">
                                    <Input
                                        type="date"
                                        value={personalData.birthDate}
                                        onChange={(event) => updatePersonalData("birthDate", event.target.value)}
                                    />
                                </Field>
                                <Field label="Tipo de contrato">
                                    <Select value={personalData.contractType} onValueChange={(value) => updatePersonalData("contractType", value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {contractTypes.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label="Jornada laboral">
                                    <Select value={personalData.workdayType} onValueChange={(value) => updatePersonalData("workdayType", value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {workdayTypes.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label="Horas semanales (1-56)">
                                    <Input
                                        type="number"
                                        min={1}
                                        max={56}
                                        value={personalData.weeklyHours}
                                        onChange={(event) => updatePersonalData("weeklyHours", event.target.value)}
                                        placeholder="42"
                                    />
                                    <p className="mt-2 text-xs text-slate-500">Ordinaria max. 42 h. Con HH.EE.: tope 56 h.</p>
                                </Field>
                            </div>
                        )}

                        {activeTab === "access" && (
                            <div className="space-y-6">
                                <div>
                                    <SectionLabel>Rol base</SectionLabel>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {roleOptions.map((role, index) => {
                                            const selected = accessData.roleValue === role.value
                                            return (
                                                <button
                                                    key={`${role.value}-${index}`}
                                                    type="button"
                                                    onClick={() => setAccessData((current) => ({ ...current, roleValue: role.value }))}
                                                    className={cn(
                                                        "min-h-16 rounded-lg border px-4 py-3 text-center transition-colors",
                                                        selected
                                                            ? "border-slate-800 bg-slate-50 text-slate-950 dark:border-slate-100 dark:bg-slate-700 dark:text-white"
                                                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
                                                    )}
                                                >
                                                    <span className="block text-xs font-black uppercase text-slate-800 dark:text-white">{role.label}</span>
                                                    <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-300">{role.details}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field label="Clave inicial *">
                                        <div className="relative">
                                            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                type="password"
                                                value={accessData.password}
                                                onChange={(event) => setAccessData((current) => ({ ...current, password: event.target.value }))}
                                                placeholder="Minimo 6 caracteres"
                                                className="pl-9"
                                            />
                                        </div>
                                    </Field>
                                    <Field label="Tiendas asignadas">
                                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                                            {stores.length === 0 ? (
                                                <p className="text-sm text-slate-500 dark:text-slate-300">No hay tiendas disponibles.</p>
                                            ) : (
                                                <div className="grid max-h-32 gap-2 overflow-y-auto">
                                                    {stores.map((store) => (
                                                        <CheckboxRow
                                                            key={store.storeID}
                                                            id={`store-${store.storeID}`}
                                                            label={store.name}
                                                            checked={selectedStores.includes(store.storeID)}
                                                            onCheckedChange={(checked) => toggleStore(store.storeID, checked)}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </Field>
                                </div>

                                <div>
                                    <SectionLabel>Modulos accesibles</SectionLabel>
                                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                                        Los modulos del rol base estan marcados en violeta. Puedes agregar extras en verde.
                                    </p>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        {moduleOptions.map((module) => {
                                            const Icon = module.icon
                                            const isBase = baseModules.includes(module.key)
                                            const isSelected = selectedModuleKeys.includes(module.key)
                                            return (
                                                <button
                                                    key={module.key}
                                                    type="button"
                                                    onClick={() => toggleExtraModule(module.key)}
                                                    className={cn(
                                                        "flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2 text-left text-sm font-semibold transition-colors",
                                                        isBase
                                                            ? "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100"
                                                            : isSelected
                                                              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
                                                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
                                                    )}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                    {module.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "permissions" && (
                            <div className="space-y-5">
                                <p className="text-sm text-slate-500 dark:text-slate-300">
                                    Permisos granulares adicionales para este usuario, independiente del rol base.
                                </p>
                                {["Ventas y caja", "Inventario", "Egresos y reportes"].map((group) => (
                                    <div key={group} className="space-y-3">
                                        <SectionLabel>{group}</SectionLabel>
                                        {permissions
                                            .filter((permission) => permission.group === group)
                                            .map((permission) => (
                                                <div key={permission.key} className="flex items-center justify-between gap-3">
                                                    <CheckboxRow
                                                        id={`permission-${permission.key}`}
                                                        label={permission.label}
                                                        checked={selectedPermissions.includes(permission.key)}
                                                        onCheckedChange={(checked) => togglePermission(permission.key, checked)}
                                                    />
                                                    {permission.authorizer && (
                                                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                                                            Autoriza: {permission.authorizer}
                                                        </Badge>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === "discounts" && (
                            <div className="space-y-6">
                                <p className="text-sm text-slate-500 dark:text-slate-300">
                                    Define el tope de descuento que puede aplicar este usuario a su discrecion en una venta.
                                </p>
                                <div className="rounded-lg border border-slate-200 p-5 dark:border-slate-700">
                                    <SectionLabel>Descuento maximo autorizado</SectionLabel>
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
                                        Equivale a{" "}
                                        <span className="font-bold text-emerald-700">
                                            ${Math.round(36538 * (discountPercent / 100)).toLocaleString("es-CL")}
                                        </span>{" "}
                                        sobre el ticket promedio de la tienda ($36.538)
                                    </p>
                                </div>

                                <Field label="Tope en monto fijo (opcional)">
                                    <Input
                                        inputMode="numeric"
                                        value={discountLimit}
                                        onChange={(event) => setDiscountLimit(event.target.value)}
                                        placeholder="Ej: 10000 (deja en 0 para usar solo el %)"
                                    />
                                </Field>
                            </div>
                        )}

                        {activeTab === "history" && (
                            <div className="space-y-6">
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                                    <div className="flex gap-2">
                                        <ShieldCheck className="mt-0.5 h-4 w-4" />
                                        <p>
                                            Al crear el usuario se registrara automaticamente el evento de{" "}
                                            <span className="font-bold">inicio de relacion laboral</span> en el historial.
                                        </p>
                                    </div>
                                </div>
                                <Field label="Detalle del inicio (opcional)">
                                    <Textarea
                                        value={historyNote}
                                        onChange={(event) => setHistoryNote(event.target.value)}
                                        placeholder="Descripcion del cargo, area, condiciones especiales..."
                                    />
                                </Field>
                                <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                                    <CalendarDays className="h-4 w-4" />
                                    Fecha de inicio: {personalData.startDate || "Sin definir"}
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
                            {isSubmitting ? "Creando..." : "Crear usuario"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function Field({
    label,
    children,
    className,
}: {
    label: string
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={className}>
            <Label className="mb-2 block text-xs font-black uppercase text-slate-500 dark:text-slate-300">{label}</Label>
            {children}
        </div>
    )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-300">{children}</p>
}

function CheckboxRow({
    id,
    label,
    checked,
    onCheckedChange,
}: {
    id: string
    label: string
    checked: boolean
    onCheckedChange: (checked: boolean) => void
}) {
    return (
        <div className="flex items-center gap-3">
            <Checkbox id={id} checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
            <Label htmlFor={id} className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
                {label}
            </Label>
        </div>
    )
}
