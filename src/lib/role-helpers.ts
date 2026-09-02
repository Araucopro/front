import type { ITenantRole } from "@/interfaces/roles/IRole"
import { Role, type UserRole } from "@/lib/userRoles"

export const LEGACY_ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
    { value: Role.Admin, label: "Admin" },
    { value: Role.Vendedor, label: "Store Manager" },
    { value: Role.Consignado, label: "Consignado" },
    { value: Role.Tercero, label: "Tercero" },
]

const legacyRoleLabels = new Map(LEGACY_ROLE_OPTIONS.map((role) => [role.value, role.label]))

const systemRoleMap: Record<string, UserRole> = {
    ADMIN: Role.Admin,
    TENANT_ADMIN: Role.Admin,
    STORE_MANAGER: Role.Vendedor,
    VENDEDOR: Role.Vendedor,
    CONSIGNADO: Role.Consignado,
    TERCERO: Role.Tercero,
}

export const getLegacyRoleLabel = (role?: string | null) => {
    if (!role) return "Sin rol"
    return legacyRoleLabels.get(role as UserRole) ?? role
}

export const getRoleDisplayName = (role: Pick<ITenantRole, "name" | "systemKey">) => {
    if (role.systemKey && systemRoleMap[role.systemKey]) {
        return legacyRoleLabels.get(systemRoleMap[role.systemKey]) ?? role.name
    }

    return role.name
}

export const getRoleAssignmentValue = (role: ITenantRole) => {
    if (role.systemKey && systemRoleMap[role.systemKey]) {
        return systemRoleMap[role.systemKey]
    }

    return role.id
}

export const buildUserRolePayload = (roleValue: string) => {
    if ((LEGACY_ROLE_OPTIONS as Array<{ value: string; label: string }>).some((role) => role.value === roleValue)) {
        return { role: roleValue }
    }

    return { roleID: roleValue }
}
