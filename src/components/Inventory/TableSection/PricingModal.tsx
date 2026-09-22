"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    History,
    Tag,
    TrendingUp,
    TrendingDown,
    Plus,
    Loader2,
    BadgePercent,
    DollarSign,
    CheckCircle2,
    XCircle,
} from "lucide-react"
import { IProductVariation, IStoreProduct } from "@/interfaces/products/IProductVariation"
import { IProduct } from "@/interfaces/products/IProduct"
import {
    IPriceHistoryItem,
    IPriceCheck,
    DiscountType,
    PriceType,
    IUpdatePriceResponse,
} from "@/interfaces/pricing/IPricing"
import { getPriceHistory } from "@/actions/pricing/getPriceHistory"
import { getPriceCheck } from "@/actions/pricing/getPriceCheck"
import { updatePrice } from "@/actions/pricing/updatePrice"
import { createOffer } from "@/actions/pricing/createOffer"
import { updateOffer } from "@/actions/pricing/updateOffer"
import { useAuth } from "@/stores/user.store"
import { toast } from "sonner"

const toNumber = (value: unknown): number | null => {
    if (value === undefined || value === null || value === "") return null

    const parsed = typeof value === "number" ? value : Number(value.toString().replace(/[^\d.-]/g, ""))
    return Number.isFinite(parsed) ? parsed : null
}

const getFirstValidNumber = (...values: unknown[]): number => {
    for (const value of values) {
        const parsed = toNumber(value)
        if (parsed !== null) return parsed
    }

    return 0
}

const toPrice = (value: unknown) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(toNumber(value) ?? 0)

const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-"

const getHistoryDate = (historyItem: IPriceHistoryItem) => historyItem.createdAt ?? historyItem.effectiveDate ?? ""

const getPriceTypeLabel = (priceType: string) => (priceType.toLowerCase() === "list" ? "Plaza" : "Costo")

type Tab = "price-check" | "history" | "offer"

type PricingStoreProduct = Partial<IStoreProduct> & {
    priceCost?: number | string
    priceList?: number | string
    stock?: number
}

type PricingVariation = IProductVariation & {
    size?: string
}

const buildOfferForm = (offer?: IPriceCheck["activeOffer"]) => ({
    discountType: offer?.discountType ?? ("PERCENTAGE" as DiscountType),
    value: offer?.value?.toString() ?? "",
    description: offer?.description ?? "",
    startDate: offer?.startDate ? offer.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    endDate: offer?.endDate ? offer.endDate.slice(0, 10) : "",
    isActive: offer?.isActive ?? true,
})

interface PricingModalProps {
    isOpen: boolean
    onClose: () => void
    product: IProduct
    variation: IProductVariation
    storeProduct?: IStoreProduct // storeProductID requerido para ofertas
    storeID: string
    onPriceUpdated?: (updatedPrice: IUpdatePriceResponse) => void
}

export function PricingModal({
    isOpen,
    onClose,
    product,
    variation,
    storeProduct,
    storeID,
    onPriceUpdated,
}: PricingModalProps) {
    const { user } = useAuth()
    const [tab, setTab] = useState<Tab>("price-check")
    const [updatedStoreProduct, setUpdatedStoreProduct] = useState<PricingStoreProduct | null>(null)
    const currentStoreProduct = (updatedStoreProduct ?? storeProduct) as PricingStoreProduct | undefined
    const currentVariation = variation as PricingVariation
    const currentPriceList = getFirstValidNumber(
        currentStoreProduct?.priceList,
        currentStoreProduct?.priceListStore,
        variation.priceList,
    )
    const currentPriceCost = getFirstValidNumber(
        currentStoreProduct?.priceCost,
        currentStoreProduct?.priceCostStore,
        variation.priceCost,
    )
    const variationSize = variation.sizeNumber || currentVariation.size || "-"

    // ── Price check ──────────────────────────────────────────────────────────
    const [priceCheck, setPriceCheck] = useState<IPriceCheck | null>(null)
    const [loadingCheck, setLoadingCheck] = useState(false)

    // ── Historial ────────────────────────────────────────────────────────────
    const [history, setHistory] = useState<IPriceHistoryItem[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    // ── Actualizar precio ────────────────────────────────────────────────────
    const [newPrice, setNewPrice] = useState("")
    const [priceType, setPriceType] = useState<PriceType>("list")
    const [priceReason, setPriceReason] = useState("")
    const [savingPrice, setSavingPrice] = useState(false)

    // ── Oferta ───────────────────────────────────────────────────────────────
    const [offerForm, setOfferForm] = useState(buildOfferForm())
    const [savingOffer, setSavingOffer] = useState(false)
    const hasOffer = !!priceCheck?.activeOffer

    useEffect(() => {
        if (!isOpen || tab !== "offer") return
        setOfferForm(buildOfferForm(priceCheck?.activeOffer))
    }, [isOpen, tab, priceCheck?.activeOffer])

    useEffect(() => {
        setUpdatedStoreProduct(null)
    }, [storeProduct?.storeProductID])

    // ── Carga inicial según tab ──────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return
        if (tab === "price-check" && storeProduct?.storeProductID) {
            setLoadingCheck(true)
            getPriceCheck(storeProduct.storeProductID)
                .then(setPriceCheck)
                .catch(() => toast.error("No se pudo obtener el precio final"))
                .finally(() => setLoadingCheck(false))
        }
        if (tab === "history") {
            setLoadingHistory(true)
            getPriceHistory(storeID, variation.variationID)
                .then(setHistory)
                .catch(() => toast.error("No se pudo obtener el historial"))
                .finally(() => setLoadingHistory(false))
        }
    }, [isOpen, tab, storeProduct?.storeProductID, storeID, variation.variationID])

    // ── Guardar actualización de precio ──────────────────────────────────────
    const handleUpdatePrice = async () => {
        const parsed = parseFloat(newPrice)
        if (isNaN(parsed) || parsed <= 0) {
            toast.error("Ingresa un precio válido")
            return
        }
        setSavingPrice(true)
        try {
            const updatedPrice = await updatePrice({
                storeID,
                variationID: variation.variationID,
                priceType,
                newPrice: parsed,
                reason: priceReason || undefined,
                changedBy: user?.name || user?.email || undefined,
            })

            if (updatedPrice.storeProduct) {
                setUpdatedStoreProduct(updatedPrice.storeProduct)
                onPriceUpdated?.(updatedPrice)
                setPriceCheck((current) => {
                    if (!current || priceType !== "list") return current

                    const basePrice = getFirstValidNumber(updatedPrice.storeProduct.priceList, parsed)
                    return {
                        ...current,
                        basePrice,
                        finalPrice: current.hasActiveOffer ? current.finalPrice : basePrice,
                    }
                })
            }

            if (storeProduct?.storeProductID) {
                getPriceCheck(storeProduct.storeProductID).then(setPriceCheck).catch(() => undefined)
            }

            toast.success("Precio actualizado correctamente")
            setNewPrice("")
            setPriceReason("")
            // Refrescar historial
            setTab("history")
        } catch {
            toast.error("Error al actualizar el precio")
        } finally {
            setSavingPrice(false)
        }
    }

    // ── Crear / actualizar oferta ─────────────────────────────────────────────
    const handleSaveOffer = async () => {
        const val = parseFloat(offerForm.value)
        if (isNaN(val) || val <= 0) {
            toast.error("Ingresa un valor válido para el descuento")
            return
        }
        if (!storeProduct?.storeProductID) {
            toast.error("No se encontró el ID del producto de tienda")
            return
        }
        setSavingOffer(true)
        try {
            const activeOffer = priceCheck?.activeOffer
            const payload = {
                storeProductID: storeProduct.storeProductID,
                discountType: offerForm.discountType,
                value: val,
                description: offerForm.description || undefined,
                startDate: new Date(offerForm.startDate).toISOString(),
                endDate: offerForm.endDate ? new Date(offerForm.endDate).toISOString() : undefined,
                isActive: offerForm.isActive,
                scope: activeOffer?.scope,
                exclusive: activeOffer?.exclusive,
            }
            if (activeOffer?.offerID) {
                await updateOffer(activeOffer.offerID, payload)
                toast.success("Oferta actualizada correctamente")
            } else {
                await createOffer(payload)
                toast.success("Oferta creada correctamente")
            }
            // Refrescar price-check
            setTab("price-check")
        } catch {
            toast.error("Error al guardar la oferta")
        } finally {
            setSavingOffer(false)
        }
    }

    const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: "price-check", label: "Precio Final", icon: <DollarSign className="w-4 h-4" /> },
        { key: "history", label: "Historial", icon: <History className="w-4 h-4" /> },
        {
            key: "offer",
            label: hasOffer ? "Editar Oferta" : "Nueva Oferta",
            icon: <BadgePercent className="w-4 h-4" />,
        },
    ]

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-900">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <Tag className="w-5 h-5 text-blue-500" />
                        Pricing — <span className="text-blue-600">{product.name}</span>
                        <Badge variant="outline" className="text-xs ml-1">
                            Talla {variationSize}
                        </Badge>
                        {hasOffer && (
                            <Badge className="bg-orange-500 text-white text-xs ml-1 animate-pulse">
                                🎯 Oferta activa
                            </Badge>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-gray-200 dark:border-slate-700 mb-4">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                tab === t.key
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                        >
                            {t.icon}
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── TAB: Price Check ─────────────────────────────────────── */}
                {tab === "price-check" && (
                    <div className="space-y-4">
                        {loadingCheck ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                            </div>
                        ) : !storeProduct ? (
                            <p className="text-sm text-gray-400 text-center py-6">
                                Este producto no está asignado a la tienda seleccionada.
                            </p>
                        ) : (
                            <>
                                {/* Precios actuales */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 text-center">
                                        <p className="text-xs text-gray-500 mb-1">Precio Plaza (catálogo)</p>
                                        <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                            {toPrice(currentPriceList)}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 text-center">
                                        <p className="text-xs text-gray-500 mb-1">Costo Neto</p>
                                        <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                            {toPrice(currentPriceCost)}
                                        </p>
                                    </div>
                                </div>

                                {/* Price Check del backend */}
                                {priceCheck && (
                                    <div
                                        className={`rounded-xl p-5 border-2 ${
                                            priceCheck.hasActiveOffer
                                                ? "border-orange-400 bg-orange-50 dark:bg-orange-950/30"
                                                : "border-green-300 bg-green-50 dark:bg-green-950/30"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                                                Precio Final para el Cliente
                                            </h3>
                                            {priceCheck.hasActiveOffer ? (
                                                <Badge className="bg-orange-500 text-white">🎯 Con oferta</Badge>
                                            ) : (
                                                <Badge className="bg-green-600 text-white">Precio regular</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-end gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500">Precio base</p>
                                                <p
                                                    className={`text-lg font-semibold ${priceCheck.hasActiveOffer ? "line-through text-gray-400" : "text-gray-800 dark:text-white"}`}
                                                >
                                                    {toPrice(priceCheck.basePrice)}
                                                </p>
                                            </div>
                                            {priceCheck.hasActiveOffer && (
                                                <>
                                                    <TrendingDown className="w-5 h-5 text-orange-500 mb-1" />
                                                    <div>
                                                        <p className="text-xs text-gray-500">Precio con oferta</p>
                                                        <p className="text-2xl font-bold text-orange-600">
                                                            {toPrice(priceCheck.finalPrice)}
                                                        </p>
                                                    </div>
                                                    <div className="ml-auto">
                                                        <p className="text-xs text-gray-500">Descuento</p>
                                                        <p className="text-lg font-bold text-orange-500">
                                                            {priceCheck.discountType === "PERCENTAGE"
                                                                ? `-${priceCheck.discount}%`
                                                                : `-${toPrice(priceCheck.discount ?? 0)}`}
                                                        </p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        {priceCheck.activeOffer?.description && (
                                            <p className="mt-2 text-xs text-orange-700 dark:text-orange-300 italic">
                                                &quot;{priceCheck.activeOffer.description}&quot;
                                            </p>
                                        )}
                                        {priceCheck.activeOffer && (
                                            <p className="mt-1 text-xs text-gray-400">
                                                Válida hasta:{" "}
                                                {priceCheck.activeOffer.endDate
                                                    ? formatDate(priceCheck.activeOffer.endDate)
                                                    : "Sin vencimiento"}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Actualizar precio */}
                                <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                        <TrendingUp className="w-4 h-4 text-blue-500" />
                                        Actualizar Precio
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs text-gray-500">Tipo de precio</Label>
                                            <select
                                                value={priceType}
                                                onChange={(e) => setPriceType(e.target.value as PriceType)}
                                                className="w-full mt-1 text-sm border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-800 dark:text-white"
                                            >
                                                <option value="list">Precio Plaza (LIST)</option>
                                                <option value="cost">Precio Costo (COST)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">Nuevo precio</Label>
                                            <CurrencyInput
                                                value={newPrice}
                                                onValueChange={setNewPrice}
                                                placeholder="$ 29.990"
                                                className="mt-1 text-sm dark:bg-slate-800"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-500">Motivo (opcional)</Label>
                                        <Input
                                            value={priceReason}
                                            onChange={(e) => setPriceReason(e.target.value)}
                                            placeholder="Ej: Ajuste de temporada"
                                            className="mt-1 text-sm dark:bg-slate-800"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleUpdatePrice}
                                        disabled={savingPrice || !newPrice}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        {savingPrice ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <TrendingUp className="w-4 h-4 mr-2" />
                                        )}
                                        Actualizar Precio
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── TAB: Historial ───────────────────────────────────────── */}
                {tab === "history" && (
                    <div>
                        {loadingHistory ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">
                                <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">Sin historial de cambios de precio</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                {history.map((h) => (
                                    <div
                                        key={h.historyID}
                                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700"
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {getPriceTypeLabel(h.priceType)}
                                                </Badge>
                                                <span className="text-xs text-gray-400">
                                                    {formatDate(getHistoryDate(h))}
                                                </span>
                                            </div>
                                            {h.reason && (
                                                <p className="text-xs text-gray-500 italic">&quot;{h.reason}&quot;</p>
                                            )}
                                            {h.changedBy && <p className="text-xs text-gray-400">Por: {h.changedBy}</p>}
                                        </div>
                                        <div className="flex items-center gap-2 text-right">
                                            <div>
                                                <p className="text-xs text-gray-400 line-through">
                                                    {toPrice(h.oldPrice)}
                                                </p>
                                                <p
                                                    className={`text-sm font-bold ${h.newPrice > h.oldPrice ? "text-green-600" : "text-red-500"}`}
                                                >
                                                    {toPrice(h.newPrice)}
                                                </p>
                                            </div>
                                            {h.newPrice > h.oldPrice ? (
                                                <TrendingUp className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4 text-red-400" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: Oferta ──────────────────────────────────────────── */}
                {tab === "offer" && (
                    <div className="space-y-4">
                        {hasOffer && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-300 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />
                                <span className="text-orange-700 dark:text-orange-300">
                                    Ya existe una oferta activa. Puedes modificarla a continuación.
                                </span>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs text-gray-500">Tipo de descuento</Label>
                                <select
                                    value={offerForm.discountType}
                                    onChange={(e) =>
                                        setOfferForm((f) => ({ ...f, discountType: e.target.value as DiscountType }))
                                    }
                                    className="w-full mt-1 text-sm border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-800 dark:text-white"
                                >
                                    <option value="PERCENTAGE">Porcentaje (%)</option>
                                    <option value="FIXED_PRICE">Precio fijo</option>
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs text-gray-500">
                                    Valor {offerForm.discountType === "PERCENTAGE" ? "(%)" : "(precio final)"}
                                </Label>
                                {offerForm.discountType === "FIXED_PRICE" ? (
                                    <CurrencyInput
                                        value={offerForm.value}
                                        onValueChange={(value) => setOfferForm((form) => ({ ...form, value }))}
                                        placeholder="$ 19.990"
                                        className="mt-1 text-sm dark:bg-slate-800"
                                    />
                                ) : (
                                    <Input
                                        type="number"
                                        value={offerForm.value}
                                        onChange={(event) =>
                                            setOfferForm((form) => ({ ...form, value: event.target.value }))
                                        }
                                        placeholder="Ej: 15"
                                        className="mt-1 text-sm dark:bg-slate-800"
                                    />
                                )}
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs text-gray-500">Descripción (opcional)</Label>
                            <Input
                                value={offerForm.description}
                                onChange={(e) => setOfferForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder="Ej: Oferta de temporada"
                                className="mt-1 text-sm dark:bg-slate-800"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs text-gray-500">Fecha inicio</Label>
                                <Input
                                    type="date"
                                    value={offerForm.startDate}
                                    onChange={(e) => setOfferForm((f) => ({ ...f, startDate: e.target.value }))}
                                    className="mt-1 text-sm dark:bg-slate-800"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-gray-500">Fecha fin (opcional)</Label>
                                <Input
                                    type="date"
                                    value={offerForm.endDate}
                                    onChange={(e) => setOfferForm((f) => ({ ...f, endDate: e.target.value }))}
                                    className="mt-1 text-sm dark:bg-slate-800"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={offerForm.isActive}
                                onChange={(e) => setOfferForm((f) => ({ ...f, isActive: e.target.checked }))}
                                className="rounded"
                            />
                            <Label htmlFor="isActive" className="text-sm cursor-pointer">
                                Oferta activa
                            </Label>
                            {offerForm.isActive ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                            )}
                        </div>

                        <Button
                            onClick={handleSaveOffer}
                            disabled={savingOffer || !offerForm.value}
                            className={`w-full text-white ${hasOffer ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700"}`}
                        >
                            {savingOffer ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Plus className="w-4 h-4 mr-2" />
                            )}
                            {hasOffer ? "Actualizar Oferta" : "Crear Oferta"}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
