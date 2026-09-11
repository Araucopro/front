"use client"

import { FormEvent, useMemo, useState } from "react"
import { getUsersPage } from "@/actions/users/getAllUsers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { IPermissionCatalogItem, IRolePermission, ITenantRole } from "@/interfaces/roles/IRole"
import type { IUser, IUsersResponse, UserStatus } from "@/interfaces/users/IUser"
import { getLegacyRoleLabel, getRoleDisplayName } from "@/lib/role-helpers"
import { cn } from "@/lib/utils"
import { ChevronRight, Search, Settings, ShieldCheck, Users } from "lucide-react"
import { toast } from "sonner"

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE" | "TERMINATED"

type ConfigurationUsersClientProps = {
    initialUsers: IUsersResponse
    roles: ITenantRole[]
    permissions: IPermissionCatalogItem[]
    loadError?: string
}

const ALL_ROLES_VALUE = "ALL"
const INTERNAL_SYSTEM_ROLE = "system"

const subjectLabels: Record<string, string> = {
    Sale: "Ventas",
    Product: "Inventario",
    Store: "Tiendas",
    User: "Usuarios",
    Role: "Roles",
    Expense: "Gastos",
    Report: "Reportes",
    Purchase: "Compras",
    Transfer: "Transferencias",
    Pricing: "Precios",
}

const actionLabels: Record<string, string> = {
    read: "Ver",
    write: "Crear o editar",
    create: "Crear",
    update: "Editar",
    delete: "Eliminar",
    manage: "Administrar",
}

const statusLabels: Record<string, string> = {
    ACTIVE: "Activo",
    INACTIVE: "Inactivo",
    TERMINATED: "Desvinculado",
}

const statusClasses: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700",
    INACTIVE: "bg-slate-100 text-slate-500",
    TERMINATED: "bg-rose-50 text-rose-700",
}

const roleColorClasses = [
    "border-blue-300 bg-blue-100 text-blue-950 dark:border-blue-700 dark:bg-blue-950/70 dark:text-blue-100",
    "border-cyan-300 bg-cyan-100 text-cyan-950 dark:border-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-100",
    "border-sky-300 bg-sky-100 text-sky-950 dark:border-sky-700 dark:bg-sky-950/70 dark:text-sky-100",
    "border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-100",
    "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-100",
    "border-purple-300 bg-purple-100 text-purple-950 dark:border-purple-700 dark:bg-purple-950/70 dark:text-purple-100",
]

const isInternalSystemRole = (role?: Pick<ITenantRole, "name" | "systemKey"> | null) => {
    const roleName = role?.name?.trim().toLowerCase()
    const systemKey = role?.systemKey?.trim().toLowerCase()
    return roleName === INTERNAL_SYSTEM_ROLE || systemKey === INTERNAL_SYSTEM_ROLE
}

const normalizeRoleText = (value?: string | null) => value?.trim().toLowerCase() ?? ""

const getPermissionSubject = (permission: IRolePermission) => {
    const permissionSubject = permission.permission?.subject
    if (permissionSubject) return subjectLabels[permissionSubject] ?? permissionSubject

    const [rawSubject] = permission.permissionKey.split(":")
    return subjectLabels[rawSubject] ?? rawSubject
}

const getPermissionAction = (permission: IRolePermission) => {
    const permissionAction = permission.permission?.action
    if (permissionAction) return actionLabels[permissionAction] ?? permissionAction

    const [, rawAction] = permission.permissionKey.split(":")
    return actionLabels[rawAction] ?? rawAction ?? permission.permissionKey
}

const getInitials = (name: string, email: string) => {
    const source = name.trim() || email.trim()
    if (!source) return "US"

    const words = source.split(/\s+/).filter(Boolean)
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

const getStoresText = (user: IUser) =>
    (user.userStores ?? [])
        .map((relation) => relation.store?.name)
        .filter((name): name is string => Boolean(name))
        .join(", ") || "Sin tiendas"

export default function ConfigurationUsersClient({
    initialUsers,
    roles,
    permissions,
    loadError,
}: ConfigurationUsersClientProps) {
    const [users, setUsers] = useState(initialUsers.users)
    const [meta, setMeta] = useState(initialUsers.meta)
    const [search, setSearch] = useState("")
    const [selectedRoleID, setSelectedRoleID] = useState(ALL_ROLES_VALUE)
    const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("ALL")
    const [isLoading, setIsLoading] = useState(false)

    const visibleRoles = useMemo(() => roles.filter((role) => !isInternalSystemRole(role)), [roles])

    const rolesById = useMemo(() => new Map(visibleRoles.map((role) => [role.id, role])), [visibleRoles])

    const rolesByName = useMemo(
        () => new Map(visibleRoles.map((role) => [normalizeRoleText(role.name), role])),
        [visibleRoles],
    )

    const visibleUsers = useMemo(() => {
        return users.filter((user) => {
            if (normalizeRoleText(user.role) === INTERNAL_SYSTEM_ROLE) return false
            if (user.roleID && roles.some((role) => role.id === user.roleID && isInternalSystemRole(role))) {
                return false
            }
            const roleByName = rolesByName.get(normalizeRoleText(user.role))
            return !isInternalSystemRole(roleByName)
        })
    }, [roles, rolesByName, users])

    const groupedUsers = useMemo(() => {
        return visibleUsers.reduce<Array<{ key: string; label: string; users: IUser[] }>>((groups, user) => {
            const role = user.roleID ? rolesById.get(user.roleID) : rolesByName.get(normalizeRoleText(user.role))
            const label = role ? getRoleDisplayName(role) : getLegacyRoleLabel(user.role)
            const key = role?.id ?? user.role ?? "sin-rol"
            const existing = groups.find((group) => group.key === key)

            if (existing) {
                existing.users.push(user)
            } else {
                groups.push({ key, label, users: [user] })
            }

            return groups
        }, [])
    }, [rolesById, rolesByName, visibleUsers])

    const permissionTypeCount = useMemo(() => {
        const subjects = new Set(permissions.map((permission) => subjectLabels[permission.subject] ?? permission.subject))
        return subjects.size
    }, [permissions])

    const totalPages = Math.max(1, Math.ceil(meta.total / Math.max(meta.limit, 1)))
    const currentPage = meta.page || 1
    const canGoPrevious = currentPage > 1
    const canGoNext = currentPage < totalPages

    const fetchUsers = async (nextPage = 1, overrides?: Partial<{ search: string; roleID: string; status: StatusFilter }>) => {
        const nextSearch = overrides?.search ?? search
        const nextRoleID = overrides?.roleID ?? selectedRoleID
        const nextStatus = overrides?.status ?? selectedStatus
        const limit = meta.limit || 10

        setIsLoading(true)
        try {
            const response = await getUsersPage({
                limit,
                offset: (nextPage - 1) * limit,
                search: nextSearch,
                roleID: nextRoleID === ALL_ROLES_VALUE ? undefined : nextRoleID,
                status: nextStatus === "ALL" ? undefined : (nextStatus as UserStatus),
            })
            setUsers(response.users)
            setMeta(response.meta)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudieron cargar los usuarios")
        } finally {
            setIsLoading(false)
        }
    }

    const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        await fetchUsers(1)
    }

    const handleRoleChange = async (roleID: string) => {
        setSelectedRoleID(roleID)
        await fetchUsers(1, { roleID })
    }

    const handleStatusChange = async (status: StatusFilter) => {
        setSelectedStatus(status)
        await fetchUsers(1, { status })
    }

    return (
        <div className="space-y-5">
            {loadError && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                    {loadError}
                </div>
            )}

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                            <ShieldCheck className="h-4 w-4 text-blue-600" />
                            Roles del sistema
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                            {visibleRoles.length} roles visibles · {permissionTypeCount} tipos de permisos
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {visibleRoles.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 p-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                            No hay roles visibles para este tenant.
                        </div>
                    ) : (
                        visibleRoles.map((role, index) => (
                            <RolePermissionsRow
                                key={role.id}
                                role={role}
                                colorClass={roleColorClasses[index % roleColorClasses.length]}
                            />
                        ))
                    )}
                </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                            <Users className="h-4 w-4 text-emerald-600" />
                            Usuarios del tenant
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                            {meta.total} usuarios registrados
                        </p>
                    </div>
                    <Button type="button" className="bg-slate-700 text-white hover:bg-slate-800">
                        <Settings className="h-4 w-4" />
                        Nuevo usuario
                    </Button>
                </div>

                <form onSubmit={handleSearch} className="mb-5 grid gap-3 lg:grid-cols-[1fr_220px_180px_auto]">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar por nombre o correo..."
                            className="pl-9"
                        />
                    </div>
                    <Select value={selectedRoleID} onValueChange={handleRoleChange}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_ROLES_VALUE}>Todos los roles</SelectItem>
                            {visibleRoles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                    {getRoleDisplayName(role)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedStatus} onValueChange={(value) => handleStatusChange(value as StatusFilter)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos los estados</SelectItem>
                            <SelectItem value="ACTIVE">Activos</SelectItem>
                            <SelectItem value="INACTIVE">Inactivos</SelectItem>
                            <SelectItem value="TERMINATED">Desvinculados</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button type="submit" variant="outline" disabled={isLoading}>
                        Buscar
                    </Button>
                </form>

                <div className="space-y-5">
                    {groupedUsers.length === 0 ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                            {isLoading ? "Cargando usuarios..." : "No hay usuarios para los filtros seleccionados."}
                        </div>
                    ) : (
                        groupedUsers.map((group, index) => (
                            <div key={group.key} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={cn("uppercase", roleColorClasses[index % roleColorClasses.length])}>
                                        {group.label}
                                    </Badge>
                                    <span className="text-xs font-medium uppercase text-slate-500">
                                        {group.users.length} persona{group.users.length === 1 ? "" : "s"}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {group.users.map((user) => (
                                        <UserRow key={user.userID} user={user} />
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                        Página {currentPage} de {totalPages} · {meta.total} usuarios
                    </span>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" disabled={!canGoPrevious || isLoading} onClick={() => fetchUsers(currentPage - 1)}>
                            Anterior
                        </Button>
                        <Button type="button" variant="outline" disabled={!canGoNext || isLoading} onClick={() => fetchUsers(currentPage + 1)}>
                            Siguiente
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    )
}

function RolePermissionsRow({
    role,
    colorClass,
}: {
    role: ITenantRole
    colorClass: string
}) {
    const groupedPermissions = role.permissions.reduce<Record<string, IRolePermission[]>>((groups, permission) => {
        const subject = getPermissionSubject(permission)
        groups[subject] = [...(groups[subject] ?? []), permission]
        return groups
    }, {})

    const permissionSummary = Object.entries(groupedPermissions)
        .map(([subject, permissions]) => {
            const actions = Array.from(
                new Set(
                    permissions.map((permission) => {
                        const action = getPermissionAction(permission)
                        return permission.scope === "ALL" ? action : `${action} (${permission.scope})`
                    }),
                ),
            )
            return `${subject}: ${actions.join(", ")}`
        })
        .join(" · ")

    return (
        <div className="grid items-start gap-3 sm:grid-cols-[150px_1fr]">
            <div>
                <Badge variant="outline" className={cn("px-3 py-1 text-xs font-bold", colorClass)}>
                    {getRoleDisplayName(role)}
                </Badge>
            </div>
            <p className="pt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {permissionSummary || "Sin permisos asignados."}
            </p>
        </div>
    )
}

function UserRow({ user }: { user: IUser }) {
    const status = user.status ?? "ACTIVE"

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sm font-black text-slate-700 dark:bg-slate-700 dark:text-white">
                        {getInitials(user.name, user.email)}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate font-bold text-slate-950 dark:text-white">{user.name || "Sin nombre"}</p>
                        <p className="truncate text-sm text-slate-500 dark:text-slate-300">
                            {user.userID} · {user.email}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-300">{getStoresText(user)}</p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                    <span className={cn("rounded-full px-2 py-1 text-xs font-bold", statusClasses[status] ?? statusClasses.INACTIVE)}>
                        {statusLabels[status] ?? status}
                    </span>
                    <Switch checked={status === "ACTIVE"} className="data-[state=checked]:bg-slate-700" />
                    <Button type="button" variant="ghost" size="icon" title="Ver usuario">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
