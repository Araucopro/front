import { IStore } from "../stores/IStore"
import { IUser } from "../users/IUser"

// Para enviar una nueva venta desde el frontend
export type PaymentType = "Efectivo" | "Debito" | "Credito"
export type SaleType = "BOLETA" | "FACTURA" | "NOTA_VENTA"
export type ElectronicDocumentType = Exclude<SaleType, "NOTA_VENTA">
export type PaymentStatus = "Pagado" | "Pendiente" | "Anulado" | "EMITIDA" | "CONVERTIDA"

export interface ISaleItemRequest {
    storeProductID: string
    quantity: number
}

export interface ISaleReceiver {
    rut: string
    name: string
    email?: string
    address: string
    city: string
    giro: string
}

export interface ISaleRequest {
    saleType: SaleType
    paymentType: PaymentType
    issueDate?: string
    manualDiscount?: number
    receiver?: ISaleReceiver
    items: ISaleItemRequest[]
}

export interface ISaleDte {
    dteDocumentID: string
    TOKEN: string
    FOLIO: number | null
    STATUS: string
    PDF?: string
    XML?: string
    WARNING: unknown[]
    saleID: string | null
}

export interface ISaleOperationResponse {
    sale: ISaleResponse
    dte: ISaleDte | null
}

export interface ISaleListFilters {
    saleType?: SaleType
    status?: "EMITIDA" | "CONVERTIDA"
    from?: string
    to?: string
    page?: number
    limit?: number
}

export interface ISaleListMeta {
    page: number
    limit: number
    total: number
}

export interface ISaleListResponse {
    sales: ISaleResponse[]
    meta: ISaleListMeta
}

export interface IUpdateSaleStatus {
    status: PaymentStatus
}

// Para representar un producto vendido
export interface IProductSold {
    storeProductID: string
    quantitySold: number
}

// Variación de producto dentro de una venta (tal como la devuelve el API)
export interface IVariationInSale {
    variationID: string
    productID: string
    sku: string
    color: string
    size: string
    createdAt: string
    updatedAt: string
}

export interface ISaleProduct {
    saleProductID: string
    saleID: string
    variationID: string
    storeProductID?: string
    variation: IVariationInSale
    unitPrice: number | string
    subtotal: number | string
    quantitySold: number
    createdAt: string
    updatedAt: string
}

// Para representar una venta que viene desde el backend (respuesta)
export interface ISaleResponse {
    saleID: string
    storeID: string
    total: number
    status: PaymentStatus
    createdAt: string
    paymentType?: string
    saleType?: SaleType
    issueDate?: string
    manualDiscount?: number
    receiver?: ISaleReceiver | null
    dte?: ISaleDte | null
    Store: IStore
    SaleProducts: ISaleProduct[]
    Return: ISaleReturn | null
}

export interface IsaleProductReturned {
    returnItemID: string
    returnID: string
    storeProductID?: string
    saleProductID?: string
    variationID?: string
    returnedQuantity: number
    unitPrice: string
    createdAt: string
    updatedAt: string
}

export interface ISaleReturn {
    returnID: string
    saleID: string
    clientEmail: string
    reason: string
    type: "DEVOLUCION" | "GARANTIA"
    processedBy: string
    additionalNotes: string
    createdAt: string
    updatedAt: string
    User: IUser
    ProductAnulations: IsaleProductReturned[]
}

export type ISendSaleReturn = Omit<ISaleReturn, "returnID" | "createdAt" | "updatedAt" | "User" | "saleID"> & {
    returnedProducts?: {
        storeProductID?: string
        saleProductID?: string
        variationID?: string
        quantity: number
    }[]
}
