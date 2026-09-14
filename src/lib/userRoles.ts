export const Role = {
    Admin: "admin",
    Consignado: "consignado",
    Vendedor: "store_manager",
    Tercero: "tercero",
} as const

export type LegacyUserRole = (typeof Role)[keyof typeof Role]
export type UserRole = LegacyUserRole | (string & {})
