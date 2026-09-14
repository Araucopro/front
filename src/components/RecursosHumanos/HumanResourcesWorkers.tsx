"use client"

import { FormEvent, useMemo, useState } from "react"
import { getUsersPage } from "@/actions/users/getAllUsers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import NewHumanResourcesUserDialog from "@/components/RecursosHumanos/NewHumanResourcesUserDialog"
import HumanResourcesWorkerDetailDialog from "@/components/RecursosHumanos/HumanResourcesWorkerDetailDialog"
import type { ITenantRole } from "@/interfaces/roles/IRole"
import type { IStore } from "@/interfaces/stores/IStore"
import type { IUser, IUsersResponse, UserStatus } from "@/interfaces/users/IUser"
import { getLegacyRoleLabel, getRoleDisplayName } from "@/lib/role-helpers"
import { cn } from "@/lib/utils"
import { BriefcaseBusiness, ChevronRight, Clock3, Search, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"

type WorkersTab = "workers" | "requests" | "vacations"
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE" | "TERMINATED"

type HumanResourcesWorkersProps = {
    initialData: IUsersResponse
    roles: ITenantRole[]
    stores: IStore[]
    loadError?: string
}

const tabs: Array<{ id: WorkersTab; label: string }> = [
    { id: "workers", label: "Trabajadores" },
    { id: "requests", label: "Solicitudes" },
    { id: "vacations", label: "Vacaciones" },
]

const ALL_ROLES_VALUE = "ALL"
const INTERNAL_SYSTEM_ROLE = "system"

const isInternalSystemRole = (role?: Pick<ITenantRole, "name" | "systemKey"> | null) => {
    const roleName = role?.name?.trim().toLowerCase()
    const systemKey = role?.systemKey?.trim().toLowerCase()
    return roleName === INTERNAL_SYSTEM_ROLE || systemKey === INTERNAL_SYSTEM_ROLE
}

const normalizeRoleText = (value?: string | null) => value?.trim().toLowerCase() ?? ""

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

const getRoleColor = (index: number) => {
    const colors = [
        "border-blue-100 bg-blue-50 text-blue-900",
        "border-cyan-100 bg-cyan-50 text-cyan-800",
        "border-sky-100 bg-sky-50 text-sky-800",
        "border-emerald-100 bg-emerald-50 text-emerald-800",
        "border-amber-100 bg-amber-50 text-amber-800",
        "border-purple-100 bg-purple-50 text-purple-800",
    ]
    return colors[index % colors.length]
}

const getRoleTextColor = (index: number) => {
    const colors = [
        "text-blue-900",
        "text-cyan-800",
        "text-sky-800",
        "text-emerald-800",
        "text-amber-800",
        "text-purple-800",
    ]
    return colors[index % colors.length]
}

export default function HumanResourcesWorkers({ initialData, roles, stores, loadError }: HumanResourcesWorkersProps) {
    const [activeTab, setActiveTab] = useState<WorkersTab>("workers")
    const [users, setUsers] = useState(initialData.users)
    const [meta, setMeta] = useState(initialData.meta)
    const [search, setSearch] = useState("")
    const [selectedRoleID, setSelectedRoleID] = useState(ALL_ROLES_VALUE)
    const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("ALL")
    const [isLoading, setIsLoading] = useState(false)
    const [isNewUserOpen, setIsNewUserOpen] = useState(false)
    const [selectedWorker, setSelectedWorker] = useState<IUser | null>(null)

    const visibleRoles = useMemo(() => roles.filter((role) => !isInternalSystemRole(role)), [roles])

    const rolesById = useMemo(() => {
        return new Map(visibleRoles.map((role) => [role.id, role]))
    }, [visibleRoles])

    const rolesByName = useMemo(() => {
        return new Map(visibleRoles.map((role) => [normalizeRoleText(role.name), role]))
    }, [visibleRoles])

    const visibleUsers = useMemo(() => {
        return users.filter((user) => {
            if (normalizeRoleText(user.role) === INTERNAL_SYSTEM_ROLE) return false
            if (user.roleID && !rolesById.has(user.roleID) && roles.some((role) => role.id === user.roleID && isInternalSystemRole(role))) {
                return false
            }
            const roleByName = rolesByName.get(normalizeRoleText(user.role))
            return !isInternalSystemRole(roleByName)
        })
    }, [roles, rolesById, rolesByName, users])

    const statusCounts = useMemo(() => {
        return visibleUsers.reduce(
            (acc, user) => {
                const status = user.status ?? "ACTIVE"
                if (status === "ACTIVE") acc.active += 1
                else if (status === "INACTIVE") acc.inactive += 1
                else acc.terminated += 1
                return acc
            },
            { active: 0, inactive: 0, terminated: 0 },
        )
    }, [visibleUsers])

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

    const activeRoleSummary = useMemo(() => {
        return visibleUsers
            .filter((user) => (user.status ?? "ACTIVE") === "ACTIVE")
            .reduce<Array<{ key: string; label: string; total: number }>>((summary, user) => {
                const role = user.roleID ? rolesById.get(user.roleID) : rolesByName.get(normalizeRoleText(user.role))
                const label = role ? getRoleDisplayName(role) : getLegacyRoleLabel(user.role)
                const key = role?.id ?? user.role ?? "sin-rol"
                const existing = summary.find((item) => item.key === key)

                if (existing) {
                    existing.total += 1
                } else {
                    summary.push({ key, label, total: 1 })
                }

                return summary
            }, [])
    }, [rolesById, rolesByName, visibleUsers])

    const totalPages = Math.max(1, Math.ceil(meta.total / Math.max(meta.limit, 1)))
    const currentPage = meta.page || 1
    const canGoPrevious = currentPage > 1
    const canGoNext = currentPage < totalPages

    const fetchUsers = async (nextPage = 1, overrides?: Partial<{ search: string; roleID: string; status: StatusFilter }>) => {
        const nextSearch = overrides?.search ?? search
        const nextRoleID = overrides?.roleID ?? selectedRoleID
        const nextStatus = overrides?.status ?? selectedStatus
        const limit = meta.limit || 10
        const offset = (nextPage - 1) * limit

        setIsLoading(true)
        try {
            const response = await getUsersPage({
                limit,
                offset,
                search: nextSearch,
                roleID: nextRoleID === ALL_ROLES_VALUE ? undefined : nextRoleID,
                status: nextStatus === "ALL" ? undefined : (nextStatus as UserStatus),
            })
            setUsers(response.users)
            setMeta(response.meta)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudieron cargar los trabajadores")
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
        <section className="space-y-5">
            {loadError && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                    {loadError}
                </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-indigo-600" />
                        <h2 className="font-bold text-slate-950 dark:text-white">Equipo activo</h2>
                        <span className="text-sm font-semibold text-slate-300">
                            {statusCounts.active} persona{statusCounts.active === 1 ? "" : "s"}
                        </span>
                    </div>
                    <Button type="button" className="bg-slate-700 text-white hover:bg-slate-800" onClick={() => setIsNewUserOpen(true)}>
                        <UserPlus className="h-4 w-4" />
                        Nuevo usuario
                    </Button>
                </div>

                {activeRoleSummary.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                        No hay trabajadores activos para mostrar.
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {activeRoleSummary.map((item, index) => (
                            <div
                                key={item.key}
                                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                            >
                                <div className="flex items-center gap-3">
                                    <BriefcaseBusiness className={cn("h-5 w-5", getRoleTextColor(index))} />
                                    <div>
                                        <p className={cn("text-xs font-black uppercase", getRoleTextColor(index))}>{item.label}</p>
                                        <p className="text-2xl font-black text-slate-950 dark:text-white">{item.total}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700">
                <div className="flex gap-8 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "border-b-2 px-1 py-4 text-sm font-medium transition-colors",
                                activeTab === tab.id
                                    ? "border-slate-900 text-slate-950 dark:border-white dark:text-white"
                                    : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSearch} className="grid gap-3 lg:grid-cols-[1fr_220px_180px_auto]">
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

            <div className="grid gap-3 md:grid-cols-3">
                <StatusCard label="Activos" total={statusCounts.active} active={selectedStatus === "ACTIVE"} onClick={() => handleStatusChange("ACTIVE")} />
                <StatusCard label="Inactivos" total={statusCounts.inactive} active={selectedStatus === "INACTIVE"} onClick={() => handleStatusChange("INACTIVE")} />
                <StatusCard label="Desvinculados" total={statusCounts.terminated} active={selectedStatus === "TERMINATED"} onClick={() => handleStatusChange("TERMINATED")} />
            </div>

            {activeTab === "workers" && (
                <div className="space-y-5">
                    {groupedUsers.length === 0 ? (
                        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {isLoading ? "Cargando trabajadores..." : "No hay trabajadores para los filtros seleccionados."}
                        </div>
                    ) : (
                        groupedUsers.map((group, index) => (
                            <div key={group.key} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={cn("uppercase", getRoleColor(index))}>
                                        {group.label}
                                    </Badge>
                                    <span className="text-xs font-medium uppercase text-slate-500">
                                        {group.users.length} persona{group.users.length === 1 ? "" : "s"}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {group.users.map((user) => (
                                        <WorkerRow key={user.userID} user={user} pendingCount={0} onOpen={() => setSelectedWorker(user)} />
                                    ))}
                                </div>
                            </div>
                        ))
                    )}

                    <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                            Pagina {currentPage} de {totalPages} · {meta.total} trabajadores
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
                </div>
            )}

            {activeTab === "requests" && (
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="mb-4 flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-amber-500" />
                        <h3 className="font-bold text-slate-950 dark:text-white">Solicitudes pendientes</h3>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Las solicitudes siguen como mock hasta conectar el endpoint de permisos.
                        </p>
                    </div>
                </div>
            )}

            {activeTab === "vacations" && (
                <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    No hay vacaciones programadas en el mock actual.
                </div>
            )}

            <NewHumanResourcesUserDialog
                open={isNewUserOpen}
                onOpenChange={setIsNewUserOpen}
                roles={visibleRoles}
                stores={stores}
                onCreated={() => fetchUsers(1)}
            />
            <HumanResourcesWorkerDetailDialog
                open={!!selectedWorker}
                onOpenChange={(open) => {
                    if (!open) setSelectedWorker(null)
                }}
                user={selectedWorker}
                roles={visibleRoles}
                onSaved={() => fetchUsers(currentPage)}
            />
        </section>
    )
}

function StatusCard({
    label,
    total,
    active = false,
    onClick,
}: {
    label: string
    total: number
    active?: boolean
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "rounded-lg border bg-white p-5 text-center shadow-sm transition-colors dark:bg-slate-800",
                active ? "border-emerald-600 bg-emerald-50 dark:border-emerald-500" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700",
            )}
        >
            <p className={cn("text-3xl font-black", active ? "text-emerald-700" : "text-slate-400")}>{total}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
        </button>
    )
}

function WorkerRow({ user, pendingCount, onOpen }: { user: IUser; pendingCount: number; onOpen: () => void }) {
    const active = (user.status ?? "ACTIVE") === "ACTIVE"

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onOpen()
            }}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sm font-black text-slate-700 dark:bg-slate-700 dark:text-white">
                        {getInitials(user.name, user.email)}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate font-bold text-slate-950 dark:text-white">{user.name || "Sin nombre"}</p>
                        <p className="truncate text-sm text-slate-500 dark:text-slate-300">{user.email}</p>
                        <p className="truncate text-sm text-slate-500 dark:text-slate-300">{user.phone || getStoresText(user)}</p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                    <div onClick={(event) => event.stopPropagation()}>
                        <Switch checked={active} className="data-[state=checked]:bg-slate-700" />
                    </div>
                    {pendingCount > 0 && (
                        <div className="rounded-lg bg-amber-100 px-4 py-2 text-center text-xs font-bold text-amber-800">
                            <span className="block text-base leading-none">{pendingCount}</span>
                            pendiente
                        </div>
                    )}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Ver trabajador"
                        onClick={(event) => {
                            event.stopPropagation()
                            onOpen()
                        }}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
