export type RolePermissionScope = "OWN" | "ALL"

export interface IPermissionCatalogItem {
    key: string
    subject: string
    action: string
    supportsOwnScope: boolean
    description: string
}

export interface IRolePermission {
    id: string
    tenantID: string
    roleID: string
    permissionKey: string
    scope: RolePermissionScope
    permission?: IPermissionCatalogItem | null
}

export interface ITenantRole {
    id: string
    tenantID: string
    name: string
    systemKey?: string | null
    isSystem: boolean
    permissions: IRolePermission[]
    createdAt: string
    updatedAt: string
}

export interface IRolePermissionInput {
    permissionKey: string
    scope: RolePermissionScope
}
