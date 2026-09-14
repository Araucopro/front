export type ClientSegment = "RETAIL" | "WHOLESALE"

export interface IClient {
    clientID: string
    tenantID: string
    rut: string
    name: string
    giro: string | null
    address: string | null
    city: string | null
    email: string | null
    phone: string | null
    segment: ClientSegment
    notes: string | null
    createdAt: string
    updatedAt: string
}

export interface IClientPayload {
    rut: string
    name: string
    giro?: string
    address?: string
    city?: string
    email?: string
    phone?: string
    segment?: ClientSegment
    notes?: string
}

export interface IClientsQuery {
    page?: number
    limit?: number
    search?: string
    segment?: ClientSegment
}

export interface IClientsResponse {
    clients: IClient[]
    meta: {
        page: number
        limit: number
        total: number
    }
}
