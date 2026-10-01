import type { IStore } from "@/interfaces/stores/IStore"
import type { IUser } from "@/interfaces/users/IUser"
import type { PaymentMethodType } from "@/interfaces/cash-registers/ICashCatalogs"
import type {
    ISaleDte,
    ISaleOperationResponse,
    ISalePayment,
    ISaleProduct,
    ISaleReceiver,
    ISaleResponse,
    ISaleReturn,
    IsaleProductReturned,
    IVariationInSale,
} from "@/interfaces/sales/ISale"
import { pickArray, pickFirst, toStringValue } from "./normalize-helpers"
import { normalizeStore } from "./normalize-user-store"
import { normalizeReturn, type RawReturn } from "./normalize-return"

export type RawSaleVariation = {
    variationID?: string
    productID?: string
    sku?: string
    color?: string | null
    size?: string
    sizeNumber?: string
    createdAt?: string
    updatedAt?: string
    product?: RawSaleProductSummary | null
    Product?: RawSaleProductSummary | null
}

export type RawSaleProductSummary = {
    productID?: string
    name?: string
}

export type RawSaleProduct = {
    saleItemID?: string
    saleProductID?: string
    saleID?: string
    variationID?: string
    storeProductID?: string
    productName?: string
    name?: string
    product?: RawSaleProductSummary | null
    Product?: RawSaleProductSummary | null
    variation?: RawSaleVariation | null
    unitPrice?: number | string
    subtotal?: number | string
    lineTotal?: number | string
    sku?: string
    quantitySold?: number
    quantity?: number
    createdAt?: string
    updatedAt?: string
}

export type RawSaleReturnProduct = {
    returnItemID?: string
    returnID?: string
    storeProductID?: string
    saleProductID?: string
    variationID?: string
    returnedQuantity?: number
    unitPrice?: number | string
    createdAt?: string
    updatedAt?: string
}

export type RawSaleReturn = {
    returnID?: string
    saleID?: string
    clientEmail?: string
    reason?: string
    type?: ISaleReturn["type"]
    processedBy?: string
    additionalNotes?: string
    createdAt?: string
    updatedAt?: string
    user?: IUser | null
    User?: IUser | null
    ProductAnulations?: RawSaleReturnProduct[]
    productAnulations?: RawSaleReturnProduct[]
}

export type RawSale = {
    saleID?: string
    id?: string
    storeID?: string
    store?: IStore | null
    Store?: IStore | null
    total?: number | string
    grandTotal?: number | string
    netTotal?: number | string
    subtotal?: number | string
    discount?: number | string
    taxTotal?: number | string
    status?: ISaleResponse["status"] | string
    createdAt?: string
    updatedAt?: string
    fmaPago?: ISaleResponse["fmaPago"]
    payments?: RawSalePayment[]
    Payments?: RawSalePayment[]
    paymentType?: ISaleResponse["paymentType"]
    saleType?: ISaleResponse["saleType"]
    folio?: number | string | null
    issueDate?: string
    manualDiscount?: number | string
    receiver?: Partial<ISaleReceiver> | null
    Receiver?: Partial<ISaleReceiver> | null
    items?: RawSaleProduct[]
    saleProducts?: RawSaleProduct[]
    SaleProducts?: RawSaleProduct[]
    return?: RawSaleReturn | null
    Return?: RawSaleReturn | null
    returns?: RawReturn[]
    Returns?: RawReturn[]
    dteDocument?: RawSaleDte | null
}

type RawSalePaymentMethod = {
    paymentMethodID?: string
    code?: string
    name?: string
    type?: PaymentMethodType
}

type RawSalePayment = {
    paymentID?: string
    paymentMethodID?: string
    paymentMethod?: RawSalePaymentMethod | null
    PaymentMethod?: RawSalePaymentMethod | null
    amount?: number | string
    status?: ISalePayment["status"]
    paidAt?: string
    authorizationCode?: string | null
    transactionID?: string | null
    reference?: string | null
}

export type RawSaleDte = {
    dteDocumentID?: string
    TOKEN?: string
    FOLIO?: number | string | null
    STATUS?: string
    PDF?: string
    XML?: string
    WARNING?: unknown[]
    saleID?: string | null
    token?: string
    folio?: number | string | null
    status?: string
}

export type RawSaleOperation = {
    sale?: RawSale
    dte?: RawSaleDte | null
}

const normalizeVariation = (raw: RawSaleVariation | null | undefined): IVariationInSale => ({
    variationID: raw?.variationID ?? "",
    productID: raw?.productID ?? "",
    sku: raw?.sku ?? "",
    color: raw?.color ?? "",
    size: pickFirst(raw?.size, raw?.sizeNumber) ?? "",
    createdAt: raw?.createdAt ?? "",
    updatedAt: raw?.updatedAt ?? "",
})

const normalizeSaleProduct = (raw: RawSaleProduct): ISaleProduct => ({
    saleItemID: raw.saleItemID ?? raw.saleProductID ?? "",
    saleProductID: raw.saleProductID ?? raw.saleItemID ?? "",
    saleID: raw.saleID ?? "",
    variationID: raw.variationID ?? raw.variation?.variationID ?? "",
    storeProductID: raw.storeProductID,
    productName:
        raw.productName ??
        raw.name ??
        raw.product?.name ??
        raw.Product?.name ??
        raw.variation?.product?.name ??
        raw.variation?.Product?.name,
    variation: {
        ...normalizeVariation(raw.variation),
        sku: raw.sku ?? raw.variation?.sku ?? "",
    },
    unitPrice: raw.unitPrice ?? 0,
    subtotal: raw.subtotal ?? raw.lineTotal ?? 0,
    quantitySold: pickFirst(raw.quantitySold, raw.quantity) ?? 0,
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
})

const normalizeSalePayment = (raw: RawSalePayment): ISalePayment => {
    const paymentMethod = raw.paymentMethod ?? raw.PaymentMethod ?? null
    return {
        paymentID: raw.paymentID ?? "",
        paymentMethodID: raw.paymentMethodID ?? paymentMethod?.paymentMethodID ?? "",
        paymentMethod: paymentMethod
            ? {
                  paymentMethodID: paymentMethod.paymentMethodID ?? raw.paymentMethodID ?? "",
                  code: paymentMethod.code ?? "",
                  name: paymentMethod.name ?? paymentMethod.code ?? "Medio de pago",
                  type: paymentMethod.type ?? "OTHER",
              }
            : null,
        amount: Number(raw.amount ?? 0),
        status: raw.status ?? "COMPLETED",
        paidAt: raw.paidAt ?? "",
        authorizationCode: raw.authorizationCode ?? null,
        transactionID: raw.transactionID ?? null,
        reference: raw.reference ?? null,
    }
}

const normalizeReceiver = (raw: Partial<ISaleReceiver> | null | undefined): ISaleReceiver | null => {
    if (!raw) return null

    return {
        rut: raw.rut ?? "",
        name: raw.name ?? "",
        email: raw.email,
        address: raw.address ?? "",
        city: raw.city ?? "",
        giro: raw.giro ?? "",
    }
}

export const normalizeSaleDte = (raw: RawSaleDte | null | undefined): ISaleDte | null => {
    if (!raw) return null

    const rawFolio = raw.FOLIO ?? raw.folio
    const folio = rawFolio === null || rawFolio === undefined || rawFolio === "" ? null : Number(rawFolio)

    return {
        dteDocumentID: raw.dteDocumentID ?? "",
        TOKEN: raw.TOKEN ?? raw.token ?? "",
        FOLIO: folio !== null && Number.isFinite(folio) ? folio : null,
        STATUS: raw.STATUS ?? raw.status ?? "",
        PDF: raw.PDF,
        XML: raw.XML,
        WARNING: Array.isArray(raw.WARNING) ? raw.WARNING : [],
        saleID: raw.saleID ?? null,
    }
}

const normalizeReturnItem = (raw: RawSaleReturnProduct): IsaleProductReturned => ({
    returnItemID: raw.returnItemID ?? "",
    returnID: raw.returnID ?? "",
    storeProductID: raw.storeProductID,
    saleProductID: raw.saleProductID,
    variationID: raw.variationID,
    returnedQuantity: raw.returnedQuantity ?? 0,
    unitPrice: toStringValue(raw.unitPrice),
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
})

const normalizeSaleReturn = (raw: RawSaleReturn | null | undefined): ISaleReturn | null => {
    if (!raw) return null

    const fallbackUser: IUser = {
        userID: "",
        name: raw.processedBy ?? "",
        email: raw.clientEmail ?? "",
        role: "admin",
        password: "",
        userImg: null,
        createdAt: raw.createdAt ?? "",
        updatedAt: raw.updatedAt ?? "",
        userStores: [],
        Stores: [],
    }

    return {
        returnID: raw.returnID ?? "",
        saleID: raw.saleID ?? "",
        clientEmail: raw.clientEmail ?? "",
        reason: raw.reason ?? "",
        type: raw.type ?? "DEVOLUCION",
        processedBy: raw.processedBy ?? "",
        additionalNotes: raw.additionalNotes ?? "",
        createdAt: raw.createdAt ?? "",
        updatedAt: raw.updatedAt ?? "",
        User: raw.user ?? raw.User ?? fallbackUser,
        ProductAnulations: (raw.ProductAnulations ?? raw.productAnulations ?? []).map(normalizeReturnItem),
    }
}

export const normalizeSale = (raw: RawSale, fallbackStoreID = "", dte?: RawSaleDte | null): ISaleResponse => {
    const store = pickFirst(raw.store, raw.Store) ?? null
    const saleProducts = pickArray(raw.saleProducts, raw.SaleProducts, raw.items)
    const saleReturn = pickFirst(raw.return, raw.Return) ?? null
    const returns = pickArray(raw.returns, raw.Returns)
    const receiver = pickFirst(raw.receiver, raw.Receiver) ?? null
    const parsedFolio = raw.folio === null || raw.folio === undefined || raw.folio === "" ? null : Number(raw.folio)

    return {
        saleID: raw.saleID ?? raw.id ?? "",
        storeID: raw.storeID ?? store?.storeID ?? fallbackStoreID,
        total: Number(pickFirst(raw.total, raw.grandTotal, raw.netTotal) ?? 0),
        subtotal: raw.subtotal === undefined ? undefined : Number(raw.subtotal),
        discount: raw.discount === undefined ? undefined : Number(raw.discount),
        netTotal: raw.netTotal === undefined ? undefined : Number(raw.netTotal),
        taxTotal: raw.taxTotal === undefined ? undefined : Number(raw.taxTotal),
        status: (raw.status as ISaleResponse["status"]) ?? "Pendiente",
        createdAt: raw.createdAt ?? raw.issueDate ?? "",
        fmaPago: raw.fmaPago,
        payments: pickArray(raw.payments, raw.Payments).map(normalizeSalePayment),
        paymentType: raw.paymentType,
        saleType: raw.saleType,
        folio: parsedFolio !== null && Number.isFinite(parsedFolio) ? parsedFolio : null,
        issueDate: raw.issueDate,
        manualDiscount: raw.manualDiscount === undefined ? undefined : Number(raw.manualDiscount),
        receiver: normalizeReceiver(receiver),
        dte: normalizeSaleDte(dte ?? raw.dteDocument),
        Store: normalizeStore(store ?? {}),
        SaleProducts: saleProducts.map(normalizeSaleProduct),
        Return: normalizeSaleReturn(saleReturn),
        Returns: returns.map(normalizeReturn),
    }
}

export const normalizeSaleOperation = (
    raw: RawSaleOperation,
    fallbackStoreID = "",
): ISaleOperationResponse => {
    const sale = raw.sale ?? {}
    const dte = normalizeSaleDte(raw.dte ?? sale.dteDocument)
    return {
        sale: {
            ...normalizeSale(sale, fallbackStoreID, raw.dte ?? sale.dteDocument),
            dte,
        },
        dte,
    }
}
