"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DiscountModal, DiscountStoreProductOption } from "./DiscountModal"
import { updateOffer } from "@/actions/pricing/updateOffer"
import { IProduct } from "@/interfaces/products/IProduct"
import { IStoreProduct } from "@/interfaces/products/IProductVariation"
import { ISpecialOffer } from "@/interfaces/pricing/IPricing"
import { AlertTriangle, Box, Plus } from "lucide-react"
import { toast } from "sonner"

interface DiscountManagementPanelProps {
    products: IProduct[]
    offers: ISpecialOffer[]
}

type DiscountStoreProductRow = DiscountStoreProductOption & {
    stockQuantity: number
    finalPrice?: number
    discountApplied?: boolean
    activeOffer?: IStoreProduct["activeOffer"]
    specialOffers?: IStoreProduct["specialOffers"]
}

type DiscountOfferRow = {
    offerID: string
    storeProductID?: string
    productName: string
    detail: string
    type: string
    typeTone: string
    valueLabel: string
    baseLabel?: string
    validityLabel: string
    statusLabel: "Activa" | "Pausada"
    isActive: boolean
    isMock?: boolean
    mockNote?: string
    createdAt: string
}

const mockDiscountRows: DiscountOfferRow[] = [
    {
        offerID: "mock-cascade",
        productName: "Cascada de margen",
        detail: "Regla escalonada por tramo",
        type: "Cascada",
        typeTone: "bg-teal-50 text-teal-700",
        valueLabel: "Escalonado",
        validityLabel: "Permanente",
        statusLabel: "Activa",
        isActive: true,
        isMock: true,
        mockNote: "Mock: falta semantica backend para cascada",
        createdAt: "2026-06-20",
    },
]

const formatCurrency = (value?: number) =>
    value === undefined
        ? "Sin dato"
        : new Intl.NumberFormat("es-CL", {
              style: "currency",
              currency: "CLP",
              maximumFractionDigits: 0,
          }).format(value)

const formatDate = (value?: string) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""

    return new Intl.DateTimeFormat("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "America/Santiago",
    }).format(date)
}

const getStoreProductRelation = (offer: ISpecialOffer) => offer.storeProduct ?? null

const getProductName = (offer: ISpecialOffer) => {
    const storeProduct = getStoreProductRelation(offer)
    return storeProduct?.variation?.product?.name ?? offer.description ?? "Descuento sin nombre"
}

const getVariationName = (offer: ISpecialOffer) => {
    const storeProduct = getStoreProductRelation(offer)
    return storeProduct?.variation?.size ?? storeProduct?.variation?.sizeNumber ?? "Producto seleccionado"
}

const getStoreName = (offer: ISpecialOffer) => {
    const storeProduct = getStoreProductRelation(offer)
    return storeProduct?.store?.name ?? storeProduct?.Store?.name ?? "Tienda"
}

const getStoreProductStock = (storeProduct: IStoreProduct) => {
    const quantity = Number(storeProduct.quantity)
    return Number.isFinite(quantity) ? quantity : 0
}

const getOfferValueLabel = (discountType: string, value: number) => {
    if (discountType === "BUY_X_GET_Y") return "2x1"
    if (discountType === "BUNDLE") return "Combo"
    if (discountType === "PERCENTAGE") return `${value}%`
    return formatCurrency(value)
}

const getDiscountTypeMeta = (offer: Pick<ISpecialOffer, "discountType" | "targetScope">) => {
    if (offer.discountType === "BUY_X_GET_Y") return { label: "2x1", tone: "bg-orange-50 text-orange-700" }
    if (offer.discountType === "BUNDLE") return { label: "Combo", tone: "bg-pink-50 text-pink-700" }
    if (offer.targetScope === "STORE") return { label: "Tienda %", tone: "bg-blue-50 text-blue-950" }
    if (offer.targetScope === "CATEGORY") return { label: "Por Categoria", tone: "bg-orange-50 text-orange-700" }
    if (offer.targetScope === "BRAND") return { label: "Por Marca", tone: "bg-cyan-50 text-cyan-700" }
    if (offer.targetScope === "MODEL") return { label: "Por Modelo", tone: "bg-pink-50 text-pink-700" }
    if (offer.discountType === "PERCENTAGE") return { label: "% Directo", tone: "bg-blue-50 text-blue-700" }
    if (offer.discountType === "FIXED_AMOUNT") return { label: "$ Fijo", tone: "bg-emerald-50 text-emerald-700" }
    return { label: "Precio Fijo", tone: "bg-slate-100 text-slate-700" }
}

const getValidityLabel = (startDate: string, endDate?: string) => {
    const start = formatDate(startDate)
    const end = formatDate(endDate)
    if (start && end) return `${start} -> ${end}`
    if (start) return "Permanente"
    return "Sin vigencia"
}

export function DiscountManagementPanel({ products, offers }: DiscountManagementPanelProps) {
    const router = useRouter()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [initialStoreProduct, setInitialStoreProduct] = useState<string>()
    const [selectedOffer, setSelectedOffer] = useState<ISpecialOffer | null>(null)
    const [mockActiveById, setMockActiveById] = useState(
        () => new Map(mockDiscountRows.map((row) => [row.offerID, row.isActive] as const)),
    )
    const [savingOfferID, setSavingOfferID] = useState<string | null>(null)

    const storeProductOptions = useMemo<DiscountStoreProductRow[]>(() => {
        const flattened: DiscountStoreProductRow[] = []
        products.forEach((product) => {
            product.ProductVariations.forEach((variation) => {
                variation.StoreProducts?.forEach((storeProduct) => {
                    const stockQuantity = getStoreProductStock(storeProduct)
                    if (stockQuantity <= 0) return

                    flattened.push({
                        storeProductID: storeProduct.storeProductID,
                        productName: product.name,
                        variationName: variation.sizeNumber,
                        storeName: storeProduct.Store?.name ?? "",
                        storeID: storeProduct.storeID,
                        priceList: Number(storeProduct.priceListStore) || variation.priceList,
                        sku: variation.sku,
                        productID: product.productID,
                        categoryID: product.categoryID ?? undefined,
                        categoryName: product.Category?.name,
                        brand: product.brand,
                        model: product.name,
                        stockQuantity,
                        finalPrice: storeProduct.finalPrice,
                        discountApplied: storeProduct.discountApplied,
                        activeOffer: storeProduct.activeOffer,
                        specialOffers: storeProduct.specialOffers,
                    })
                })
            })
        })
        return flattened
    }, [products])

    const availableStoreProductIDs = useMemo(
        () => new Set(storeProductOptions.map((option) => option.storeProductID)),
        [storeProductOptions],
    )

    const realOfferRows = useMemo<DiscountOfferRow[]>(() => {
        const rowsById = new Map<string, DiscountOfferRow>()

        for (const offer of offers) {
            const storeProduct = getStoreProductRelation(offer)
            const storeProductID = offer.storeProductID ?? storeProduct?.storeProductID ?? ""
            if (storeProductID && !availableStoreProductIDs.has(storeProductID)) continue

            const option = storeProductOptions.find((item) => item.storeProductID === storeProductID)
            const typeMeta = getDiscountTypeMeta(offer)
            rowsById.set(offer.offerID, {
                offerID: offer.offerID,
                storeProductID,
                productName: option?.productName ?? getProductName(offer),
                detail:
                    offer.targetScope === "CATEGORY"
                        ? `Categoria: ${offer.category?.name ?? offer.categoryID ?? "Sin categoria"}`
                        : offer.targetScope === "BRAND"
                          ? `Marca: ${offer.brand ?? "Sin marca"}`
                          : offer.targetScope === "MODEL"
                            ? `Modelo: ${offer.model ?? "Sin modelo"}`
                            : offer.targetScope === "STORE"
                              ? `Tienda: ${offer.store?.name ?? option?.storeName ?? getStoreName(offer)}`
                              : `${option?.variationName ?? getVariationName(offer)} - ${option?.storeName ?? getStoreName(offer)}`,
                type: typeMeta.label,
                typeTone: typeMeta.tone,
                valueLabel: getOfferValueLabel(offer.discountType, offer.value),
                baseLabel: `Base: ${formatCurrency(option?.priceList ?? storeProduct?.priceList)}`,
                validityLabel: getValidityLabel(offer.startDate, offer.endDate),
                statusLabel: offer.isActive ? "Activa" : "Pausada",
                isActive: offer.isActive,
                createdAt: offer.createdAt,
            })
        }

        for (const option of storeProductOptions) {
            const storeProductOffers = [option.activeOffer, ...(option.specialOffers ?? [])].filter(Boolean)

            for (const offer of storeProductOffers) {
                if (!offer?.offerID || rowsById.has(offer.offerID)) continue

                const typeMeta = getDiscountTypeMeta(offer)
                rowsById.set(offer.offerID, {
                    offerID: offer.offerID,
                    storeProductID: option.storeProductID,
                    productName: option.productName,
                    detail: `${option.variationName} - ${option.storeName}`,
                    type: typeMeta.label,
                    typeTone: typeMeta.tone,
                    valueLabel: getOfferValueLabel(offer.discountType, offer.value),
                    baseLabel: `Base: ${formatCurrency(option.priceList)}`,
                    validityLabel: getValidityLabel(offer.startDate, offer.endDate),
                    statusLabel: offer.isActive ? "Activa" : "Pausada",
                    isActive: offer.isActive,
                    createdAt: offer.createdAt,
                })
            }
        }

        return Array.from(rowsById.values()).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    }, [availableStoreProductIDs, offers, storeProductOptions])

    const offerRows = useMemo<DiscountOfferRow[]>(() => {
        const mockRows = mockDiscountRows.map((row) => {
            const isActive = mockActiveById.get(row.offerID) ?? row.isActive
            return {
                ...row,
                isActive,
                statusLabel: isActive ? ("Activa" as const) : ("Pausada" as const),
            }
        })

        return [...realOfferRows, ...mockRows]
    }, [mockActiveById, realOfferRows])

    const handleOpenModal = (storeProductID?: string, offer?: ISpecialOffer | null) => {
        setInitialStoreProduct(storeProductID)
        setSelectedOffer(offer ?? null)
        setIsModalOpen(true)
    }

    const handleToggleOffer = async (offer: DiscountOfferRow, checked: boolean) => {
        if (offer.isMock) {
            setMockActiveById((current) => new Map(current).set(offer.offerID, checked))
            toast.message("Tipo de descuento mock: falta contrato backend.")
            return
        }

        setSavingOfferID(offer.offerID)
        try {
            await updateOffer(offer.offerID, { isActive: checked })
            toast.success(checked ? "Descuento activado" : "Descuento pausado")
            router.refresh()
        } catch {
            toast.error("No se pudo actualizar el estado del descuento")
        } finally {
            setSavingOfferID(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className="font-semibold">Contrato de descuentos actualizado</span>
                        <span className="rounded-full border border-amber-300 px-2 py-0.5 text-xs">
                            Categoria, marca, modelo, 2x1 y combo ya usan el API nuevo.
                        </span>
                    </div>
                    <span className="text-xs">Cascada queda como ejemplo visual hasta definir su semantica.</span>
                </div>
            </div>

            <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-900 dark:text-blue-300">
                        Inventario
                    </p>
                    <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                        Ofertas y Descuentos
                    </h1>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        Revisa todas las ofertas creadas y crea nuevas promociones desde un solo lugar.
                    </p>
                </div>
                <Button
                    variant="outline"
                    className="h-9 rounded-lg border-slate-400 bg-white px-4 font-bold text-slate-950 hover:bg-slate-50"
                    onClick={() => handleOpenModal(storeProductOptions[0]?.storeProductID)}
                >
                    <Plus className="h-4 w-4" />
                    Crear descuento
                </Button>
            </header>

            {storeProductOptions.length === 0 && realOfferRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Ningun producto tiene stock disponible para descuentos en esta tienda.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-slate-200 hover:bg-transparent">
                                <TableHead className="w-[120px] text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">
                                    Estado
                                </TableHead>
                                <TableHead className="min-w-[280px] text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">
                                    Oferta
                                </TableHead>
                                <TableHead className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">
                                    Tipo
                                </TableHead>
                                <TableHead className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">
                                    Vigencia
                                </TableHead>
                                <TableHead className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">
                                    Valor
                                </TableHead>
                                <TableHead className="w-[120px] text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">
                                    On/Off
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {offerRows.map((offer) => (
                                <TableRow
                                    key={offer.offerID}
                                    className="h-16 cursor-pointer border-b border-slate-100 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40"
                                    onClick={() => {
                                        if (offer.isMock) return
                                        handleOpenModal(
                                            offer.storeProductID,
                                            offers.find((item) => item.offerID === offer.offerID) ?? null,
                                        )
                                    }}
                                >
                                    <TableCell>
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                                                offer.isActive
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-slate-200 text-slate-600"
                                            }`}
                                        >
                                            {offer.statusLabel}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-mono text-sm font-bold text-slate-950 dark:text-slate-100">
                                                    {offer.productName}
                                                </p>
                                                {offer.isMock && (
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                                                        Mock
                                                    </span>
                                                )}
                                            </div>
                                            <p className="font-mono text-xs text-slate-500">
                                                {offer.mockNote ?? offer.detail}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`rounded-md px-2 py-1 font-mono text-xs font-bold ${offer.typeTone}`}
                                        >
                                            {offer.type}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-mono text-sm text-slate-700 dark:text-slate-300">
                                        {offer.validityLabel}
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <p className="font-mono text-sm font-bold text-blue-950 dark:text-blue-200">
                                                {offer.valueLabel}
                                            </p>
                                            {offer.baseLabel && (
                                                <p className="font-mono text-xs text-slate-500">{offer.baseLabel}</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell onClick={(event) => event.stopPropagation()}>
                                        <Switch
                                            checked={offer.isActive}
                                            disabled={savingOfferID === offer.offerID}
                                            onCheckedChange={(checked) => handleToggleOffer(offer, checked)}
                                            className="data-[state=checked]:bg-blue-950 data-[state=unchecked]:bg-slate-300"
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500">
                <Box className="h-4 w-4" />
                <span>
                    {realOfferRows.length} descuentos conectados al API - {mockDiscountRows.length} ejemplo mock de la
                    maqueta.
                </span>
            </div>

            <DiscountModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setSelectedOffer(null)
                }}
                options={storeProductOptions}
                initialStoreProductID={initialStoreProduct}
                initialOffer={selectedOffer}
                onOfferCreated={() => router.refresh()}
                onOfferUpdated={() => router.refresh()}
            />
        </div>
    )
}
