import type { ISaleDte, SaleType } from "@/interfaces/sales/ISale"

export type ReturnType = "TOTAL" | "PARCIAL" | "DESCUENTO"
export type ReturnStatus = "PENDIENTE" | "APROBADA" | "COMPLETADA" | "RECHAZADA" | "CANCELADA"
export type ReturnItemCondition = "SELLABLE" | (string & {})

export interface ICreateReturnItem {
    saleItemID: string
    quantity: number
    condition: ReturnItemCondition
    reason?: string
}

export interface ICreateReturn {
    saleID: string
    returnType: ReturnType
    items?: ICreateReturnItem[]
    discountAmount?: number
    reason?: string
    issueDate?: string
}

export interface IReturnItem {
    returnItemID: string
    returnID: string
    saleItemID: string
    storeProductID: string
    variationID: string
    productName: string
    sku: string
    quantity: number
    unitPrice: number
    unitCost: number
    lineTotal: number
    condition: ReturnItemCondition
    createdAt: string
}

export interface IReturnSaleSummary {
    saleID: string
    saleType: SaleType | string
    status: string
    folio: number | null
    issueDate: string
    total: number
    netTotal: number
    taxTotal: number
    dteDocumentID: string | null
}

export interface IReturnStoreSummary {
    storeID: string
    name: string
    rut: string
    location: string
}

export interface IReturn {
    returnID: string
    storeID: string
    saleID: string
    returnType: ReturnType
    status: ReturnStatus
    reason: string | null
    discountAmount: number
    folio: number | null
    dteDocumentID: string | null
    issueDate: string
    subtotal: number
    netTotal: number
    taxTotal: number
    total: number
    cogsTotal: number
    userID: string | null
    approvedBy: string | null
    approvedAt: string | null
    completedAt: string | null
    createdAt: string
    updatedAt: string
    items: IReturnItem[]
    sale: IReturnSaleSummary | null
    store: IReturnStoreSummary | null
    dteDocument: Record<string, unknown> | null
}

export interface IReturnOperationResponse {
    ret: IReturn
    dte: ISaleDte | null
}

export interface IReturnListFilters {
    saleID?: string
    status?: ReturnStatus
    returnType?: ReturnType
    page?: number
    limit?: number
}

export interface IReturnListResponse {
    returns: IReturnOperationResponse[]
    meta: {
        page: number
        limit: number
        total: number
    }
}
