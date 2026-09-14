import type {
    IReturn,
    IReturnItem,
    IReturnOperationResponse,
    ReturnItemCondition,
    ReturnStatus,
    ReturnType,
} from "@/interfaces/returns/IReturn"
import type { ISaleDte } from "@/interfaces/sales/ISale"

type RawReturnDte = Partial<Omit<ISaleDte, "FOLIO">> & {
    FOLIO?: number | string | null
    folio?: number | string | null
    token?: string
    status?: string
    pdf?: string
    xml?: string
    warning?: unknown[]
}

type RawReturnItem = Partial<IReturnItem> & {
    returnedQuantity?: number
    saleProductID?: string
}

export type RawReturn = Partial<Omit<IReturn, "items" | "dteDocument">> & {
    items?: RawReturnItem[]
    dteDocument?: RawReturnDte | null
}

export type RawReturnOperation = {
    ret?: RawReturn
    dte?: RawReturnDte | null
}

const toNumber = (value: unknown) => {
    const number = Number(value ?? 0)
    return Number.isFinite(number) ? number : 0
}

const normalizeReturnItem = (raw: RawReturnItem): IReturnItem => ({
    returnItemID: raw.returnItemID ?? "",
    returnID: raw.returnID ?? "",
    saleItemID: raw.saleItemID ?? raw.saleProductID ?? "",
    storeProductID: raw.storeProductID ?? "",
    variationID: raw.variationID ?? "",
    productName: raw.productName ?? "",
    sku: raw.sku ?? "",
    quantity: toNumber(raw.quantity ?? raw.returnedQuantity),
    unitPrice: toNumber(raw.unitPrice),
    unitCost: toNumber(raw.unitCost),
    lineTotal: toNumber(raw.lineTotal),
    condition: (raw.condition as ReturnItemCondition) ?? "SELLABLE",
    createdAt: raw.createdAt ?? "",
})

const normalizeReturnDte = (raw: RawReturnDte | null | undefined): ISaleDte | null => {
    if (!raw) return null
    const rawFolio = raw.FOLIO ?? raw.folio
    const folio = rawFolio === null || rawFolio === undefined || rawFolio === "" ? null : Number(rawFolio)
    return {
        dteDocumentID: raw.dteDocumentID ?? "",
        TOKEN: raw.TOKEN ?? raw.token ?? "",
        FOLIO: folio !== null && Number.isFinite(folio) ? folio : null,
        STATUS: raw.STATUS ?? raw.status ?? "",
        PDF: raw.PDF ?? raw.pdf,
        XML: raw.XML ?? raw.xml,
        WARNING: Array.isArray(raw.WARNING) ? raw.WARNING : Array.isArray(raw.warning) ? raw.warning : [],
        saleID: raw.saleID ?? null,
    }
}

export const normalizeReturn = (raw: RawReturn): IReturn => ({
    returnID: raw.returnID ?? "",
    storeID: raw.storeID ?? "",
    saleID: raw.saleID ?? "",
    returnType: (raw.returnType as ReturnType) ?? "PARCIAL",
    status: (raw.status as ReturnStatus) ?? "PENDIENTE",
    reason: raw.reason ?? null,
    discountAmount: toNumber(raw.discountAmount),
    folio: raw.folio === null || raw.folio === undefined ? null : toNumber(raw.folio),
    dteDocumentID: raw.dteDocumentID ?? null,
    issueDate: raw.issueDate ?? "",
    subtotal: toNumber(raw.subtotal),
    netTotal: toNumber(raw.netTotal),
    taxTotal: toNumber(raw.taxTotal),
    total: toNumber(raw.total),
    cogsTotal: toNumber(raw.cogsTotal),
    userID: raw.userID ?? null,
    approvedBy: raw.approvedBy ?? null,
    approvedAt: raw.approvedAt ?? null,
    completedAt: raw.completedAt ?? null,
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
    items: Array.isArray(raw.items) ? raw.items.map(normalizeReturnItem) : [],
    sale: raw.sale ?? null,
    store: raw.store ?? null,
    dteDocument: raw.dteDocument ? { ...raw.dteDocument } : null,
})

const isReturnOperation = (raw: RawReturnOperation | RawReturn): raw is RawReturnOperation =>
    "ret" in raw || "dte" in raw

export const normalizeReturnOperation = (raw: RawReturnOperation | RawReturn): IReturnOperationResponse => {
    const operation: RawReturnOperation = isReturnOperation(raw) ? raw : { ret: raw }
    return {
        ret: normalizeReturn(operation.ret ?? {}),
        dte: normalizeReturnDte(operation.dte ?? operation.ret?.dteDocument),
    }
}
