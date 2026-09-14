"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
    approveReturn,
    cancelReturn,
    createReturn,
    getReturns,
    reconcileReturn,
    rejectReturn,
} from "@/actions/returns/returnActions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { IReturn, IReturnOperationResponse, ReturnType } from "@/interfaces/returns/IReturn"
import type { ISaleDte, ISaleProduct, ISaleResponse } from "@/interfaces/sales/ISale"
import { Role } from "@/lib/userRoles"
import { useAuth } from "@/stores/user.store"
import { getChileYYYYMMDD } from "@/utils/chile-date"
import { toPrice } from "@/utils/priceFormat"
import { AlertTriangle, FileText, LoaderCircle, RotateCcw } from "lucide-react"
import { toast } from "sonner"

interface Props {
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
    sale: ISaleResponse
}

type QuantityState = Record<string, number>

const activeStatuses = new Set<IReturn["status"]>(["PENDIENTE", "APROBADA", "COMPLETADA"])
const typeLabels: Record<ReturnType, string> = {
    TOTAL: "Anulación total",
    PARCIAL: "Devolución parcial",
    DESCUENTO: "Descuento posterior",
}
const statusLabels: Record<IReturn["status"], string> = {
    PENDIENTE: "Pendiente",
    APROBADA: "Aprobada",
    COMPLETADA: "Completada",
    RECHAZADA: "Rechazada",
    CANCELADA: "Cancelada",
}

const productID = (product: ISaleProduct) => product.saleItemID || product.saleProductID
const productLabel = (product: ISaleProduct) =>
    product.productName?.trim() || product.variation?.sku?.trim() || product.variationID || "Producto"

const getReservedQuantity = (product: ISaleProduct, returns: IReturn[]) => {
    const identifiers = new Set(
        [product.saleItemID, product.saleProductID, product.variationID, product.storeProductID].filter(Boolean),
    )
    return returns
        .filter((ret) => activeStatuses.has(ret.status) && ret.returnType !== "DESCUENTO")
        .flatMap((ret) => ret.items)
        .filter((item) =>
            [item.saleItemID, item.variationID, item.storeProductID].some((identifier) => identifiers.has(identifier)),
        )
        .reduce((total, item) => total + item.quantity, 0)
}

const createIdempotencyKey = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
    return `return-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const getDocumentUrl = (document: string) =>
    /^(https?:|data:|blob:)/i.test(document) ? document : `data:application/pdf;base64,${document}`

const openCreditNote = (dte: ISaleDte | null) => {
    if (!dte?.PDF || typeof window === "undefined") return
    const openedWindow = window.open(getDocumentUrl(dte.PDF), "_blank")
    if (openedWindow) openedWindow.opener = null
}

const initialReturnOperations = (returns: IReturn[]): IReturnOperationResponse[] =>
    returns.map((ret) => ({ ret, dte: null }))

const extractWarningMessages = (value: unknown): string[] => {
    if (typeof value === "string") return value.trim() ? [value.trim()] : []
    if (Array.isArray(value)) return value.flatMap(extractWarningMessages)
    if (!value || typeof value !== "object") return []
    return Object.values(value).flatMap(extractWarningMessages)
}

const isCreditNoteIssued = ({ ret, dte }: IReturnOperationResponse) =>
    Boolean(dte && (dte.STATUS.toUpperCase() === "EMITIDO" || (dte.FOLIO && ret.status === "COMPLETADA")))

const getOperationWarnings = ({ ret, dte }: IReturnOperationResponse) => {
    const warnings = extractWarningMessages(dte?.WARNING ?? [])
    warnings.push(...extractWarningMessages(ret.dteDocument?.errorDetail))
    if (dte?.STATUS && dte.STATUS.toUpperCase() !== "EMITIDO") {
        warnings.push(`El facturador respondió con estado ${dte.STATUS}.`)
    }
    if (isCreditNoteIssued({ ret, dte }) && !dte?.PDF) {
        warnings.push("La nota de crédito fue emitida, pero el API no incluyó el documento PDF.")
    }
    return [...new Set(warnings)]
}

const showOperationWarnings = (operation: IReturnOperationResponse) => {
    getOperationWarnings(operation).forEach((warning, index) => {
        toast.warning("Advertencia de la nota de crédito", {
            description: warning,
            duration: 12000,
            id: `return-warning-${operation.ret.returnID}-${index}`,
        })
    })
}

export function AnularVentaModal({ isOpen, setIsOpen, sale }: Props) {
    const router = useRouter()
    const { user } = useAuth()
    const [returnType, setReturnType] = useState<ReturnType>("PARCIAL")
    const [reason, setReason] = useState("")
    const [issueDate, setIssueDate] = useState(() => getChileYYYYMMDD(new Date()))
    const [discountAmount, setDiscountAmount] = useState("")
    const [quantities, setQuantities] = useState<QuantityState>({})
    const [returnOperations, setReturnOperations] = useState<IReturnOperationResponse[]>(() =>
        initialReturnOperations(sale.Returns ?? []),
    )
    const [isLoadingReturns, setIsLoadingReturns] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [activeActionID, setActiveActionID] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const isAdmin = user?.role === Role.Admin
    const returns = useMemo(() => returnOperations.map((operation) => operation.ret), [returnOperations])

    const loadReturns = useCallback(async () => {
        if (!sale.storeID || !sale.saleID) return
        setIsLoadingReturns(true)
        try {
            const response = await getReturns(sale.storeID, { saleID: sale.saleID })
            setReturnOperations(response)
        } catch (loadError) {
            toast.error(loadError instanceof Error ? loadError.message : "No fue posible cargar las devoluciones.")
        } finally {
            setIsLoadingReturns(false)
        }
    }, [sale.saleID, sale.storeID])

    useEffect(() => {
        if (!isOpen) return
        setReturnType("PARCIAL")
        setReason("")
        setIssueDate(getChileYYYYMMDD(new Date()))
        setDiscountAmount("")
        setQuantities({})
        setReturnOperations(initialReturnOperations(sale.Returns ?? []))
        setError(null)
        void loadReturns()
    }, [isOpen, loadReturns, sale.Returns])

    const products = useMemo(
        () =>
            sale.SaleProducts.map((product) => {
                const reservedQuantity = getReservedQuantity(product, returns)
                return {
                    product,
                    reservedQuantity,
                    availableQuantity: Math.max(product.quantitySold - reservedQuantity, 0),
                }
            }),
        [returns, sale.SaleProducts],
    )
    const totalAvailableUnits = products.reduce((total, row) => total + row.availableQuantity, 0)

    const selectReturnType = (value: ReturnType) => {
        setReturnType(value)
        setError(null)
        setQuantities(
            value === "TOTAL"
                ? Object.fromEntries(
                      products
                          .filter(({ product, availableQuantity }) => productID(product) && availableQuantity > 0)
                          .map(({ product, availableQuantity }) => [productID(product), availableQuantity]),
                  )
                : {},
        )
    }

    const toggleProduct = (product: ISaleProduct, available: number, checked: boolean) => {
        const id = productID(product)
        if (!id) return
        setQuantities((current) => {
            if (checked) return { ...current, [id]: Math.min(1, available) }
            const next = { ...current }
            delete next[id]
            return next
        })
    }

    const updateQuantity = (product: ISaleProduct, available: number, raw: string) => {
        const id = productID(product)
        if (!id) return
        const quantity = Math.max(0, Math.min(Math.trunc(Number(raw) || 0), available))
        setQuantities((current) => ({ ...current, [id]: quantity }))
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)
        const items = products.flatMap(({ product, availableQuantity }) => {
            const id = productID(product)
            const quantity = returnType === "TOTAL" ? availableQuantity : quantities[id] ?? 0
            return id && quantity > 0
                ? [{ saleItemID: id, quantity, condition: "SELLABLE" as const }]
                : []
        })
        const discount = Number(discountAmount)

        if (returnType !== "DESCUENTO" && items.length === 0) {
            setError("Selecciona al menos un producto y una cantidad válida.")
            return
        }
        if (returnType === "DESCUENTO" && (!Number.isFinite(discount) || discount <= 0)) {
            setError("Ingresa un monto de descuento mayor a cero.")
            return
        }
        if (returnType === "DESCUENTO" && !reason.trim()) {
            setError("El motivo es obligatorio para un descuento posterior.")
            return
        }

        setIsSubmitting(true)
        try {
            const operation = await createReturn(
                sale.storeID,
                {
                    saleID: sale.saleID,
                    returnType,
                    issueDate,
                    reason: reason.trim() || undefined,
                    ...(returnType === "DESCUENTO" ? { discountAmount: discount } : { items }),
                },
                createIdempotencyKey(),
            )
            setReturnOperations((current) => [
                operation,
                ...current.filter(({ ret }) => ret.returnID !== operation.ret.returnID),
            ])
            setQuantities({})
            setDiscountAmount("")
            setReason("")
            openCreditNote(operation.dte)
            const folio = operation.dte?.FOLIO ? ` Folio ${operation.dte.FOLIO}.` : ""
            const creditNoteIssued = isCreditNoteIssued(operation)
            toast.success(
                creditNoteIssued
                    ? `Devolución registrada. Nota de crédito emitida.${folio}`
                    : operation.dte
                      ? "Devolución registrada. La nota de crédito requiere revisión."
                      : "Devolución registrada y enviada a aprobación.",
            )
            showOperationWarnings(operation)
            router.refresh()
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : "No fue posible registrar la devolución."
            setError(message)
            toast.error(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const runTransition = async (ret: IReturn, transition: "approve" | "reject" | "cancel" | "reconcile") => {
        setActiveActionID(`${ret.returnID}:${transition}`)
        try {
            const operation =
                transition === "approve"
                    ? await approveReturn(ret.returnID, sale.storeID)
                    : transition === "reject"
                      ? await rejectReturn(ret.returnID, sale.storeID)
                      : transition === "cancel"
                        ? await cancelReturn(ret.returnID, sale.storeID)
                        : await reconcileReturn(ret.returnID, sale.storeID)
            setReturnOperations((current) =>
                current.map((item) =>
                    item.ret.returnID === operation.ret.returnID
                        ? { ...operation, dte: operation.dte ?? item.dte }
                        : item,
                ),
            )
            openCreditNote(operation.dte)
            const folio = operation.dte?.FOLIO ? ` Folio ${operation.dte.FOLIO}.` : ""
            const creditNoteIssued = isCreditNoteIssued(operation)
            toast.success(
                transition === "approve"
                    ? creditNoteIssued
                        ? `Devolución aprobada. Nota de crédito emitida.${folio}`
                        : operation.dte
                          ? "Devolución aprobada. La nota de crédito requiere revisión."
                          : "Devolución aprobada."
                    : transition === "reject"
                      ? "Devolución rechazada."
                      : transition === "cancel"
                        ? "Devolución cancelada."
                        : "Conciliación actualizada.",
            )
            showOperationWarnings(operation)
            router.refresh()
        } catch (transitionError) {
            toast.error(transitionError instanceof Error ? transitionError.message : "No fue posible actualizar la devolución.")
        } finally {
            setActiveActionID(null)
        }
    }

    const hasPendingReturn = returns.some((ret) => ret.status === "PENDIENTE" || ret.status === "APROBADA")
    const canReturnProducts = totalAvailableUnits > 0

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-3xl">
                <div className="max-h-[90vh] overflow-y-auto p-6">
                    <DialogHeader>
                        <DialogTitle>Gestionar devolución</DialogTitle>
                        <DialogDescription>
                            Registra una anulación total, una devolución parcial o un descuento. La solicitud queda
                            pendiente hasta que un administrador la apruebe.
                        </DialogDescription>
                    </DialogHeader>

                    {(returns.length > 0 || isLoadingReturns) && (
                        <section className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-semibold">Solicitudes de esta venta</h3>
                                {isLoadingReturns && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            </div>
                            <div className="space-y-2">
                                {returnOperations.map((operation) => {
                                    const { ret, dte } = operation
                                    const warnings = getOperationWarnings(operation)
                                    return (
                                        <div key={ret.returnID} className="flex flex-col gap-3 rounded-md border bg-white p-3 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold">
                                                    {typeLabels[ret.returnType]} · {statusLabels[ret.status]}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {ret.returnType === "DESCUENTO"
                                                        ? `$${toPrice(ret.discountAmount)}`
                                                        : `${ret.items.reduce((sum, item) => sum + item.quantity, 0)} unidad(es)`}
                                                    {ret.folio ? ` · NCE ${ret.folio}` : ""}
                                                </p>
                                                {warnings.length > 0 && (
                                                    <div
                                                        role="alert"
                                                        className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
                                                    >
                                                        <p className="flex items-center gap-1.5 text-xs font-semibold">
                                                            <AlertTriangle className="h-4 w-4 shrink-0" />
                                                            Advertencia de la nota de crédito
                                                        </p>
                                                        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                                                            {warnings.map((warning) => (
                                                                <li key={warning}>{warning}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {dte?.PDF && (
                                                    <Button type="button" size="sm" variant="outline" asChild>
                                                        <a href={getDocumentUrl(dte.PDF)} target="_blank" rel="noreferrer">
                                                            <FileText /> Nota de crédito
                                                        </a>
                                                    </Button>
                                                )}
                                                {ret.status === "PENDIENTE" && isAdmin && (
                                                    <>
                                                        <Button type="button" size="sm" onClick={() => void runTransition(ret, "approve")} disabled={activeActionID !== null}>Aprobar</Button>
                                                        <Button type="button" size="sm" variant="outline" onClick={() => void runTransition(ret, "reject")} disabled={activeActionID !== null}>Rechazar</Button>
                                                    </>
                                                )}
                                                {ret.status === "PENDIENTE" && (
                                                    <Button type="button" size="sm" variant="ghost" onClick={() => void runTransition(ret, "cancel")} disabled={activeActionID !== null}>Cancelar</Button>
                                                )}
                                                {ret.status === "APROBADA" && isAdmin && (
                                                    <Button type="button" size="sm" variant="outline" onClick={() => void runTransition(ret, "reconcile")} disabled={activeActionID !== null}>
                                                        <RotateCcw /> Reconciliar NCE
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                    )}

                    <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
                        {hasPendingReturn && (
                            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                Las cantidades pendientes están reservadas para evitar devoluciones duplicadas.
                            </p>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="returnType">Tipo de devolución</Label>
                                <Select value={returnType} onValueChange={(value) => selectReturnType(value as ReturnType)}>
                                    <SelectTrigger id="returnType"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TOTAL" disabled={!canReturnProducts}>Anulación total</SelectItem>
                                        <SelectItem value="PARCIAL" disabled={!canReturnProducts}>Devolución parcial</SelectItem>
                                        <SelectItem value="DESCUENTO">Descuento posterior</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="returnIssueDate">Fecha de emisión</Label>
                                <Input
                                    id="returnIssueDate"
                                    type="date"
                                    value={issueDate}
                                    readOnly
                                    aria-readonly="true"
                                    tabIndex={-1}
                                    className="pointer-events-none cursor-not-allowed bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"
                                />
                            </div>
                        </div>

                        {returnType === "DESCUENTO" ? (
                            <div className="space-y-1.5">
                                <Label htmlFor="discountAmount">Monto del descuento (CLP)</Label>
                                <Input id="discountAmount" type="number" min="1" step="1" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} placeholder="Ej: 5000" required />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>Productos a devolver</Label>
                                <div className="max-h-64 overflow-y-auto rounded-md border">
                                    {products.map(({ product, reservedQuantity, availableQuantity }) => {
                                        const id = productID(product)
                                        const selected = (quantities[id] ?? 0) > 0
                                        return (
                                            <div key={id || product.variationID} className="grid gap-3 border-b p-3 last:border-b-0 sm:grid-cols-[1fr_100px_150px] sm:items-center">
                                                <div className="flex items-start gap-3">
                                                    <Checkbox checked={returnType === "TOTAL" ? availableQuantity > 0 : selected} onCheckedChange={(checked) => toggleProduct(product, availableQuantity, checked === true)} disabled={returnType === "TOTAL" || availableQuantity <= 0 || !id} aria-label={`Seleccionar ${productLabel(product)}`} />
                                                    <div>
                                                        <p className="text-sm font-medium">{productLabel(product)}</p>
                                                        <p className="text-xs text-slate-500">
                                                            SKU {product.variation?.sku || "sin código"} · Vendidas {product.quantitySold}
                                                            {reservedQuantity > 0 ? ` · Devueltas/reservadas ${reservedQuantity}` : ""}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Input type="number" min="1" max={availableQuantity} value={returnType === "TOTAL" ? availableQuantity : quantities[id] ?? ""} onChange={(event) => updateQuantity(product, availableQuantity, event.target.value)} disabled={returnType === "TOTAL" || !selected || availableQuantity <= 0} aria-label={`Cantidad de ${productLabel(product)}`} />
                                                <p className="text-xs text-slate-500">Condición: apto para venta</p>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="returnReason">Motivo {returnType === "DESCUENTO" ? "(obligatorio)" : "(opcional)"}</Label>
                            <Textarea id="returnReason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej: Producto defectuoso, talla equivocada..." required={returnType === "DESCUENTO"} />
                        </div>
                        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cerrar</Button>
                            <Button type="submit" variant={returnType === "TOTAL" ? "destructive" : "default"} disabled={isSubmitting || (returnType !== "DESCUENTO" && !canReturnProducts)}>
                                {isSubmitting && <LoaderCircle className="animate-spin" />}
                                {isSubmitting ? "Registrando..." : "Solicitar devolución"}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
