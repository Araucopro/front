"use client"

import { useMemo, useState } from "react"
import { createRole } from "@/actions/roles/createRole"
import { deleteRole } from "@/actions/roles/deleteRole"
import { getPermissions } from "@/actions/roles/getPermissions"
import { getRoles } from "@/actions/roles/getRoles"
import { updateRole } from "@/actions/roles/updateRole"
import { updateRolePermissions } from "@/actions/roles/updateRolePermissions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type {
    IPermissionCatalogItem,
    IRolePermissionInput,
    ITenantRole,
    RolePermissionScope,
} from "@/interfaces/roles/IRole"
import { getRoleDisplayName } from "@/lib/role-helpers"
import { cn } from "@/lib/utils"
import { Save, ShieldCheck, Trash2, UserCog } from "lucide-react"
import { toast } from "sonner"

type PermissionSelection = Record<string, RolePermissionScope | "NONE">

interface RolesManagementClientProps {
    initialRoles: ITenantRole[]
    initialPermissions: IPermissionCatalogItem[]
    loadError?: string
}

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

const getPermissionScopeMap = (role?: ITenantRole): PermissionSelection => {
    if (!role) return {}

    return role.permissions.reduce<PermissionSelection>((acc, permission) => {
        acc[permission.permissionKey] = permission.scope
        return acc
    }, {})
}

const isProtectedRole = (role: ITenantRole) => Boolean(role.isSystem || role.systemKey)

export default function RolesManagementClient({
    initialRoles,
    initialPermissions,
    loadError,
}: RolesManagementClientProps) {
    const [roles, setRoles] = useState(initialRoles)
    const [permissions, setPermissions] = useState(initialPermissions)
    const [selectedRoleId, setSelectedRoleId] = useState(initialRoles[0]?.id ?? "")
    const [newRoleName, setNewRoleName] = useState("")
    const [editingName, setEditingName] = useState(initialRoles[0]?.name ?? "")
    const [selection, setSelection] = useState<PermissionSelection>(getPermissionScopeMap(initialRoles[0]))
    const [isLoading, setIsLoading] = useState(false)
    const [confirmingDelete, setConfirmingDelete] = useState(false)

    const selectedRole = roles.find((role) => role.id === selectedRoleId)
    const protectedRole = selectedRole ? isProtectedRole(selectedRole) : false

    const groupedPermissions = useMemo(() => {
        return permissions.reduce<Record<string, IPermissionCatalogItem[]>>((acc, permission) => {
            const subject = subjectLabels[permission.subject] ?? permission.subject
            acc[subject] = [...(acc[subject] ?? []), permission]
            return acc
        }, {})
    }, [permissions])

    const refreshRoles = async (selectedId?: string) => {
        const [rolesResponse, permissionsResponse] = await Promise.all([getRoles(), getPermissions()])
        setRoles(rolesResponse)
        setPermissions(permissionsResponse)

        const nextSelectedRole = rolesResponse.find((role) => role.id === selectedId) ?? rolesResponse[0]
        setSelectedRoleId(nextSelectedRole?.id ?? "")
        setEditingName(nextSelectedRole?.name ?? "")
        setSelection(getPermissionScopeMap(nextSelectedRole))
    }

    const handleSelectRole = (roleId: string) => {
        const role = roles.find((item) => item.id === roleId)
        setSelectedRoleId(roleId)
        setEditingName(role?.name ?? "")
        setSelection(getPermissionScopeMap(role))
        setConfirmingDelete(false)
    }

    const handleCreateRole = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const trimmedName = newRoleName.trim()
        if (!trimmedName) return

        setIsLoading(true)
        try {
            const role = await createRole(trimmedName)
            toast.success("Rol creado correctamente")
            setNewRoleName("")
            await refreshRoles(role.id)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo crear el rol")
        } finally {
            setIsLoading(false)
        }
    }

    const handleRenameRole = async () => {
        if (!selectedRole || protectedRole) return

        const trimmedName = editingName.trim()
        if (!trimmedName || trimmedName === selectedRole.name) return

        setIsLoading(true)
        try {
            await updateRole(selectedRole.id, trimmedName)
            toast.success("Rol actualizado correctamente")
            await refreshRoles(selectedRole.id)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo actualizar el rol")
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteRole = async () => {
        if (!selectedRole || protectedRole) return

        setIsLoading(true)
        try {
            await deleteRole(selectedRole.id)
            toast.success("Rol eliminado correctamente")
            setConfirmingDelete(false)
            await refreshRoles()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo eliminar el rol")
        } finally {
            setIsLoading(false)
        }
    }

    const handlePermissionChange = (permissionKey: string, scope: RolePermissionScope | "NONE") => {
        setSelection((current) => ({
            ...current,
            [permissionKey]: scope,
        }))
    }

    const handleSavePermissions = async () => {
        if (!selectedRole) return

        const permissionsPayload = Object.entries(selection).reduce<IRolePermissionInput[]>(
            (acc, [permissionKey, scope]) => {
                if (scope === "NONE") return acc
                acc.push({ permissionKey, scope })
                return acc
            },
            [],
        )

        setIsLoading(true)
        try {
            await updateRolePermissions(selectedRole.id, permissionsPayload)
            toast.success("Permisos actualizados correctamente")
            await refreshRoles(selectedRole.id)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudieron actualizar los permisos")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {loadError && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                    {loadError}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="mb-5 flex items-center gap-2">
                        <UserCog className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Roles del tenant</h2>
                    </div>

                    <form onSubmit={handleCreateRole} className="mb-5 space-y-3">
                        <Label htmlFor="new-role-name">Nuevo rol</Label>
                        <div className="flex gap-2">
                            <Input
                                id="new-role-name"
                                value={newRoleName}
                                onChange={(event) => setNewRoleName(event.target.value)}
                                placeholder="Ej: Supervisor de ventas"
                                maxLength={128}
                            />
                            <Button type="submit" disabled={isLoading || !newRoleName.trim()}>
                                Crear
                            </Button>
                        </div>
                    </form>

                    <div className="space-y-2">
                        {roles.length === 0 ? (
                            <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                                No hay roles disponibles.
                            </p>
                        ) : (
                            roles.map((role) => (
                                <button
                                    key={role.id}
                                    type="button"
                                    onClick={() => handleSelectRole(role.id)}
                                    className={cn(
                                        "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-3 text-left transition-colors",
                                        selectedRoleId === role.id
                                            ? "border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-700 dark:bg-slate-700 dark:text-white"
                                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
                                    )}
                                >
                                    <span className="min-w-0">
                                        <span className="block truncate font-medium">{getRoleDisplayName(role)}</span>
                                        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-300">
                                            {role.permissions.length} permisos
                                        </span>
                                    </span>
                                    {isProtectedRole(role) && (
                                        <Badge variant="secondary" className="shrink-0">
                                            Base
                                        </Badge>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-slate-200 p-5 dark:border-slate-700">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <div className="mb-2 flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                        Permisos del rol
                                    </h2>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-300">
                                    Define si cada permiso queda sin acceso, limitado a registros propios o habilitado
                                    para toda la tienda.
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button
                                    type="button"
                                    onClick={handleSavePermissions}
                                    disabled={!selectedRole || isLoading}
                                    className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    <Save className="h-4 w-4" />
                                    Guardar permisos
                                </Button>
                            </div>
                        </div>
                    </div>

                    {selectedRole ? (
                        <div className="space-y-6 p-5">
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                                <div>
                                    <Label htmlFor="role-name">Nombre del rol</Label>
                                    <Input
                                        id="role-name"
                                        value={editingName}
                                        onChange={(event) => setEditingName(event.target.value)}
                                        disabled={protectedRole}
                                        maxLength={128}
                                        className="mt-2"
                                    />
                                    {protectedRole && (
                                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
                                            Este rol base conserva su identificador para compatibilidad.
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-end gap-2">
                                    <Button
                                        type="button"
                                        onClick={handleRenameRole}
                                        disabled={protectedRole || isLoading || editingName.trim() === selectedRole.name}
                                        className="bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-700"
                                    >
                                        Renombrar
                                    </Button>
                                    {confirmingDelete ? (
                                        <>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={handleDeleteRole}
                                                disabled={isLoading || protectedRole}
                                            >
                                                Confirmar
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setConfirmingDelete(false)}
                                                disabled={isLoading}
                                            >
                                                Cancelar
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={() => setConfirmingDelete(true)}
                                            disabled={protectedRole || isLoading}
                                            className="gap-2"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Eliminar
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {Object.entries(groupedPermissions).length === 0 ? (
                                <div className="rounded-md bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                                    No hay permisos en el catálogo.
                                </div>
                            ) : (
                                Object.entries(groupedPermissions).map(([subject, subjectPermissions]) => (
                                    <div key={subject} className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                                        <div className="bg-slate-50 px-4 py-3 dark:bg-slate-900">
                                            <h3 className="font-semibold text-slate-900 dark:text-white">{subject}</h3>
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Permiso</TableHead>
                                                    <TableHead className="w-[220px]">Alcance</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {subjectPermissions.map((permission) => (
                                                    <TableRow key={permission.key}>
                                                        <TableCell>
                                                            <p className="font-medium text-slate-900 dark:text-white">
                                                                {permission.description ||
                                                                    actionLabels[permission.action] ||
                                                                    permission.action}
                                                            </p>
                                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                                                                {permission.key}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={selection[permission.key] ?? "NONE"}
                                                                onValueChange={(value) =>
                                                                    handlePermissionChange(
                                                                        permission.key,
                                                                        value as RolePermissionScope | "NONE",
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="NONE">Sin permiso</SelectItem>
                                                                    {permission.supportsOwnScope && (
                                                                        <SelectItem value="OWN">Propias</SelectItem>
                                                                    )}
                                                                    <SelectItem value="ALL">Todas</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-300">
                            Selecciona o crea un rol para configurar sus permisos.
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
