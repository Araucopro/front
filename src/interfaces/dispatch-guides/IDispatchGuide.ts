export type DispatchGuideStatus = "PENDIENTE" | "EMITIDA" | "ANULACION_PENDIENTE" | "ANULADA"

export type DispatchGuideTransferIndicator = "1" | "2" | "3" | "4" | "5"

export interface IDispatchGuideReceiver {
    rut: string
    name: string
    address: string
    city: string
    giro: string
    email?: string
}

export interface IDispatchGuideDestination {
    address: string
    city: string
}

export interface IDispatchGuideTransport {
    patente?: string
    rutConductor?: string
    nombreConductor?: string
    fechaTraslado?: string
}

export interface ICreateDispatchGuideItem {
    storeProductID: string
    quantity: number
}

export interface ICreateDispatchGuide {
    destination: IDispatchGuideDestination
    items: ICreateDispatchGuideItem[]
    clientID?: string
    includePrices?: boolean
    indTraslado?: DispatchGuideTransferIndicator
    issueDate?: string
    manualDiscount?: number
    referencedDteDocumentID?: string
    receiver?: IDispatchGuideReceiver
    transport?: IDispatchGuideTransport
}

export interface IDispatchGuideItem {
    dispatchGuideItemID: string
    dispatchGuideID: string
    storeProductID: string
    variationID: string
    productName: string
    sku: string
    quantity: number
    unitPrice: number
    unitCost: number
    lineTotal: number
    createdAt: string
}

export interface IDispatchGuide {
    dispatchGuideID: string
    storeID: string
    status: DispatchGuideStatus
    folio: number | null
    dteDocumentID: string | null
    issueDate: string
    indTraslado: DispatchGuideTransferIndicator
    includePrices: boolean
    receiver: IDispatchGuideReceiver | null
    clientID: string | null
    destination: IDispatchGuideDestination
    transport: IDispatchGuideTransport | null
    subtotal: number
    discount: number
    netTotal: number
    taxTotal: number
    total: number
    cogsTotal: number
    errorDetail: string | null
    items: IDispatchGuideItem[]
    createdAt: string
    updatedAt: string
}

export interface IDispatchGuideDte {
    dteDocumentID: string
    TOKEN: string
    FOLIO: number | null
    STATUS: string
    PDF?: string
    XML?: string
    WARNING: unknown[]
    saleID: string | null
}

export type DispatchGuideInvoicePaymentType = "Efectivo" | "Debito" | "Credito"

export interface IInvoiceDispatchGuides {
    paymentType: DispatchGuideInvoicePaymentType
    additionalDispatchGuideIDs?: string[]
    issueDate?: string
}

export interface IDispatchGuideReferenceItem {
    dispatchGuideReferenceItemID: string
    variationID: string
    quantity: number
}

export interface IDispatchGuideReference {
    dispatchGuideReferenceID: string
    items: IDispatchGuideReferenceItem[]
    dteDocumentID: string
    saleID: string | null
    createdAt: string
}

export interface IDispatchGuideOperationResponse {
    dispatchGuide: IDispatchGuide
    dte: IDispatchGuideDte | null
    references: IDispatchGuideReference[]
}

export interface IDispatchGuideListFilters {
    status?: DispatchGuideStatus
    from?: string
    to?: string
    page?: number
    limit?: number
}

export interface IDispatchGuideListMeta {
    page: number
    limit: number
    total: number
}

export interface IDispatchGuideListResponse {
    dispatchGuides: IDispatchGuideOperationResponse[]
    meta: IDispatchGuideListMeta
}
