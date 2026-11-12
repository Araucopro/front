"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
    DiscountScope,
    DiscountTargetScope,
    DiscountType,
    ICreateOfferPayload,
    IOfferOptions,
    OfferSalesChannel,
    ISpecialOffer,
} from "@/interfaces/pricing/IPricing"
import { createOffer } from "@/actions/pricing/createOffer"
import { updateOffer } from "@/actions/pricing/updateOffer"
import { getOfferOptions } from "@/actions/pricing/getOfferOptions"
import { DiscountCoverageField } from "./DiscountCoverageField"
import { useDiscountManagement } from "@/hooks/useDiscountManagement"
import { normalize } from "@/utils/product-form.utils"
import { useTienda } from "@/stores/tienda.store"
import { toast } from "sonner"
import { Check, ChevronDown, Loader2, Tag } from "lucide-react"

export type DiscountStoreProductOption = {
    storeProductID: string
    productName: string
    variationName: string
    storeName: string
    storeID: string
    stockQuantity?: number
    priceList?: number
    sku?: string
    productID?: string
    categoryID?: string
    categoryName?: string
    brand?: string
    model?: string
}

type DiscountKind = {
    id: string
    label: string
    tone: string
    supported: boolean
    discountType?: DiscountType
    scope?: DiscountScope
    targetScope?: DiscountTargetScope
    buyQuantity?: number
    payQuantity?: number
}

interface DiscountModalProps {
    isOpen: boolean
    onClose: () => void
    options: DiscountStoreProductOption[]
    initialStoreProductID?: string
    initialOffer?: ISpecialOffer | null
    onOfferCreated?: (storeProductID: string) => void
    onOfferUpdated?: (storeProductID: string) => void
}

const todayISO = new Date().toISOString().slice(0, 10)
const discountKinds: DiscountKind[] = [
    {
        id: "store-percentage",
        label: "Tienda %",
        tone: "text-blue-950",
        supported: true,
        discountType: "PERCENTAGE",
        scope: "TOTAL",
        targetScope: "STORE",
    },
    {
        id: "direct-percentage",
        label: "% Directo",
        tone: "text-blue-600",
        supported: true,
        discountType: "PERCENTAGE",
        scope: "UNIT",
        targetScope: "VARIATION",
    },
    {
        id: "fixed-amount",
        label: "$ Fijo",
        tone: "text-emerald-600",
        supported: true,
        discountType: "FIXED_AMOUNT",
        scope: "UNIT",
        targetScope: "VARIATION",
    },
    {
        id: "category",
        label: "Por Categoria",
        tone: "text-orange-700",
        supported: true,
        discountType: "PERCENTAGE",
        scope: "UNIT",
        targetScope: "CATEGORY",
    },
    {
        id: "brand",
        label: "Por Marca",
        tone: "text-cyan-700",
        supported: true,
        discountType: "PERCENTAGE",
        scope: "UNIT",
        targetScope: "BRAND",
    },
    {
        id: "model",
        label: "Por Modelo",
        tone: "text-pink-600",
        supported: true,
        discountType: "PERCENTAGE",
        scope: "UNIT",
        targetScope: "MODEL",
    },
    {
        id: "size",
        label: "Por Talla",
        tone: "text-indigo-600",
        supported: true,
        discountType: "PERCENTAGE",
        scope: "UNIT",
        targetScope: "VARIATION",
    },
    {
        id: "two-for-one",
        label: "2x1",
        tone: "text-orange-600",
        supported: true,
        discountType: "BUY_X_GET_Y",
        scope: "UNIT",
        targetScope: "VARIATION",
        buyQuantity: 2,
        payQuantity: 1,
    },
    { id: "cascade", label: "Cascada", tone: "text-teal-700", supported: false },
    { id: "season", label: "Temporada", tone: "text-blue-950", supported: false },
    {
        id: "combo",
        label: "Combo",
        tone: "text-pink-700",
        supported: true,
        discountType: "BUNDLE",
        scope: "TOTAL",
        targetScope: "PRODUCT",
    },
    {
        id: "fixed-price",
        label: "Precio fijo",
        tone: "text-slate-700",
        supported: true,
        discountType: "FIXED_PRICE",
        scope: "UNIT",
        targetScope: "VARIATION",
    },
]

const formatCurrency = (value?: number) =>
    value === undefined
        ? "Sin dato"
        : new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value)

const normalizeSearchText = (value: string) =>
    normalize(value)
        .replace(/[^a-z0-9\s]/gi, " ")
        .replace(/\s+/g, " ")
        .trim()

const getKindFromOffer = (offer?: ISpecialOffer | null) => {
    if (!offer) return discountKinds[1]

    return (
        discountKinds.find((kind) => kind.discountType === "BUY_X_GET_Y" && offer.discountType === "BUY_X_GET_Y") ??
        discountKinds.find((kind) => kind.discountType === "BUNDLE" && offer.discountType === "BUNDLE") ??
        discountKinds.find((kind) => kind.discountType === offer.discountType && kind.targetScope && kind.targetScope === offer.targetScope) ??
        discountKinds.find(
            (kind) =>
                kind.supported &&
                kind.discountType === offer.discountType &&
                (kind.scope ?? "UNIT") === (offer.scope ?? "UNIT"),
        ) ?? discountKinds.find((kind) => kind.discountType === offer.discountType) ?? discountKinds[1]
    )
}

const buildForm = (
    options: DiscountStoreProductOption[],
    initialStoreProductID?: string,
    offer?: ISpecialOffer | null,
) => {
    const selectedKind = getKindFromOffer(offer)
    const storeProductID =
        offer?.storeProductID ??
        offer?.storeProduct?.storeProductID ??
        initialStoreProductID ??
        options[0]?.storeProductID ??
        ""

    return {
        storeProductID,
        targetScope: (offer?.targetScope ?? selectedKind.targetScope ?? "VARIATION") as DiscountTargetScope,
        productIDs: offer?.productIDs ?? offer?.productTargets?.map((target) => target.productID) ??
            options.filter((option) => option.storeProductID === storeProductID && option.productID).map((option) => option.productID!),
        storeIDs: offer?.storeIDs?.length ? offer.storeIDs : [offer?.storeID ?? offer?.storeProduct?.store?.storeID ??
            options.find((option) => option.storeProductID === storeProductID)?.storeID ?? ""].filter(Boolean),
        salesChannels: (offer?.salesChannels ?? (offer ? ["PHYSICAL", "ONLINE"] : ["PHYSICAL"])) as OfferSalesChannel[],
        secondaryStoreProductID: options.find((option) => option.storeProductID !== storeProductID)?.storeProductID ?? "",
        kindID: selectedKind.id,
        discountType: (offer?.discountType ?? selectedKind.discountType ?? "PERCENTAGE") as DiscountType,
        value: offer?.value?.toString() ?? "",
        name: offer?.description ?? "",
        brief: "",
        categoryID: offer?.categoryID ?? options.find((option) => option.storeProductID === storeProductID)?.categoryID ?? "",
        brand: offer?.brand ?? options.find((option) => option.storeProductID === storeProductID)?.brand ?? "",
        model: offer?.model ?? options.find((option) => option.storeProductID === storeProductID)?.model ?? "",
        includeSubcategories: offer?.includeSubcategories ?? true,
        allowBelowMargin: offer?.allowBelowMargin ?? false,
        priority: offer?.priority?.toString() ?? "0",
        startDate: offer?.startDate ? offer.startDate.slice(0, 10) : todayISO,
        endDate: offer?.endDate ? offer.endDate.slice(0, 10) : "",
        hasPeriod: Boolean(offer?.endDate),
        isActive: offer?.isActive ?? true,
        scope: (offer?.scope ?? selectedKind.scope ?? "UNIT") as DiscountScope,
        exclusive: offer?.exclusive ?? false,
    }
}

export function DiscountModal({
    isOpen,
    onClose,
    options: productOptions,
    initialStoreProductID,
    initialOffer,
    onOfferCreated,
    onOfferUpdated,
}: DiscountModalProps) {
    const canManage = useDiscountManagement()
    const { storeSelected, storesFromUser, stores } = useTienda()
    const options = useMemo(() => {
        const storeNames = new Map(
            [...stores, ...storesFromUser, ...(storeSelected ? [storeSelected] : [])]
                .map((store) => [store.storeID, store.name.trim()] as const)
                .filter(([, name]) => Boolean(name)),
        )

        return productOptions.map((option) => ({
            ...option,
            storeName: storeNames.get(option.storeID) || option.storeName.trim() || option.storeID,
        }))
    }, [productOptions, storeSelected, storesFromUser, stores])
    const [saving, setSaving] = useState(false)
    const [coverageOptions, setCoverageOptions] = useState<IOfferOptions | null>(null)
    const [coverageError, setCoverageError] = useState("")
    const [coverageRevision, setCoverageRevision] = useState(0)
    const [isProductOpen, setIsProductOpen] = useState(false)
    const [productQuery, setProductQuery] = useState("")
    const [form, setForm] = useState(() => buildForm(options, initialStoreProductID, initialOffer))

    useEffect(() => {
        if (!isOpen) return
        setForm(buildForm(options, initialStoreProductID, initialOffer))
        setProductQuery("")
        setIsProductOpen(false)
    }, [isOpen, initialStoreProductID, initialOffer, options])

    useEffect(() => {
        if (!canManage) {
            setCoverageOptions(null)
            setCoverageError("")
            return
        }
        if (!isOpen) return
        let active = true
        setCoverageOptions(null)
        setCoverageError("")
        void getOfferOptions().then((result) => {
            if (!active) return
            setCoverageOptions(result)
            setForm((current) => ({
                ...current,
                salesChannels: current.salesChannels.filter((channel) => result.salesChannels.includes(channel)),
                storeIDs: current.storeIDs.length ? current.storeIDs :
                    [storeSelected?.storeID ?? result.stores[0]?.storeID ?? ""].filter(Boolean),
            }))
        }).catch((error: unknown) => {
            if (active) setCoverageError(error instanceof Error ? error.message : "No se pudieron cargar los canales y sucursales")
        })
        return () => { active = false }
    }, [isOpen, canManage, coverageRevision, storeSelected?.storeID])

    const selectedKind = discountKinds.find((kind) => kind.id === form.kindID) ?? discountKinds[1]
    const selectedProduct = useMemo(
        () => options.find((option) => option.storeProductID === form.storeProductID),
        [form.storeProductID, options],
    )
    const secondaryProduct = useMemo(
        () => options.find((option) => option.storeProductID === form.secondaryStoreProductID),
        [form.secondaryStoreProductID, options],
    )
    const targetScope = form.targetScope
    const needsVariant = targetScope === "VARIATION" || form.discountType === "BUNDLE"
    const singleStore = needsVariant
    const productTargets = useMemo(() => {
        const products = new Map<string, string>()
        options.forEach((option) => { if (option.productID) products.set(option.productID, option.productName) })
        initialOffer?.productTargets?.forEach((target) => {
            if (!products.has(target.productID)) products.set(target.productID, target.product?.name ?? target.productID)
        })
        return Array.from(products, ([productID, name]) => ({ productID, name }))
    }, [options, initialOffer])

    const categoryOptions = useMemo(() => {
        const categories = new Map<string, string>()
        options.forEach((option) => {
            if (option.categoryID) categories.set(option.categoryID, option.categoryName || option.categoryID)
        })
        return Array.from(categories.entries()).map(([categoryID, name]) => ({ categoryID, name }))
    }, [options])

    const brandOptions = useMemo(
        () => Array.from(new Set(options.map((option) => option.brand).filter((brand): brand is string => Boolean(brand)))),
        [options],
    )

    const modelOptions = useMemo(
        () => Array.from(new Set(options.map((option) => option.model).filter((model): model is string => Boolean(model)))),
        [options],
    )

    const filteredOptions = useMemo(() => {
        const query = normalizeSearchText(productQuery)
        const candidates = needsVariant ? options.filter((option) => option.storeID === form.storeIDs[0]) : options
        if (!query) return candidates
        const tokens = query.split(" ").filter(Boolean)

        return candidates.filter((option) => {
            const searchable = normalizeSearchText(
                `${option.productName} ${option.variationName} ${option.storeName} ${option.sku ?? ""} ${option.storeProductID}`,
            )
            return tokens.every((token) => searchable.includes(token))
        })
    }, [options, productQuery, needsVariant, form.storeIDs])

    const editingOffer = !!initialOffer?.offerID
    const actionLabel = editingOffer ? "Actualizar Descuento" : "Crear Descuento"

    const handleKindSelect = (kind: DiscountKind) => {
        setForm((prev) => ({
            ...prev,
            kindID: kind.id,
            targetScope: kind.id === "two-for-one" ? "PRODUCT" : kind.targetScope ?? prev.targetScope,
            storeIDs: kind.targetScope === "VARIATION" || kind.discountType === "BUNDLE" ? prev.storeIDs.slice(0, 1) : prev.storeIDs,
            allowBelowMargin: kind.discountType === "BUY_X_GET_Y" || kind.discountType === "BUNDLE" ? true : prev.allowBelowMargin,
            discountType: (kind.discountType ?? prev.discountType) as DiscountType,
            scope: (kind.scope ?? prev.scope) as DiscountScope,
            categoryID: prev.categoryID || selectedProduct?.categoryID || "",
            brand: prev.brand || selectedProduct?.brand || "",
            model: prev.model || selectedProduct?.model || "",
        }))

        if (!kind.supported) {
            toast.message("Tipo mock: falta contrato backend para guardar esta regla.")
        }
    }

    const handleSave = async () => {
        if (!selectedKind.supported) {
            toast.error("Este tipo de descuento esta en mock hasta que exista el contrato en backend.")
            return
        }

        if (!canManage || !coverageOptions) {
            toast.error("No se puede gestionar este descuento con la sesión actual o sin cargar su alcance")
            return
        }
        if (!form.salesChannels.length || !form.storeIDs.length) {
            toast.error("Selecciona al menos un canal y una sucursal")
            return
        }
        if (form.salesChannels.includes("ONLINE") && !coverageOptions.stores.some((store) => form.storeIDs.includes(store.storeID) && store.onlineEnabled)) {
            toast.error("Selecciona una sucursal vinculada al ecommerce")
            return
        }
        if (needsVariant && (!selectedProduct || selectedProduct.storeID !== form.storeIDs[0])) {
            toast.error("Selecciona un producto de la sucursal elegida")
            return
        }
        if (targetScope === "PRODUCT" && form.discountType !== "BUNDLE" && !form.productIDs.length) {
            toast.error("Selecciona al menos un producto")
            return
        }

        const parsedValue = parseFloat(form.value)
        const requiresValue = form.discountType !== "BUY_X_GET_Y" && form.discountType !== "BUNDLE"
        if (requiresValue && (isNaN(parsedValue) || parsedValue <= 0)) {
            toast.error("El descuento debe ser mayor a 0")
            return
        }

        if (form.discountType === "PERCENTAGE" && parsedValue > 100) {
            toast.error("El porcentaje no puede ser mayor a 100%")
            return
        }

        if (
            form.discountType === "FIXED_PRICE" &&
            selectedProduct?.priceList !== undefined &&
            parsedValue >= selectedProduct.priceList
        ) {
            toast.error("El precio fijo debe ser menor al precio lista")
            return
        }

        if (targetScope === "CATEGORY" && !form.categoryID) {
            toast.error("Selecciona una categoria para este descuento")
            return
        }

        if (targetScope === "BRAND" && !form.brand) {
            toast.error("Selecciona una marca para este descuento")
            return
        }

        if (targetScope === "MODEL" && !form.model) {
            toast.error("Selecciona un modelo para este descuento")
            return
        }

        if (form.discountType === "BUNDLE" && (!secondaryProduct || secondaryProduct.storeID !== form.storeIDs[0] || secondaryProduct.storeProductID === selectedProduct?.storeProductID)) {
            toast.error("Selecciona un segundo producto para el combo")
            return
        }

        setSaving(true)
        try {
            const payload: ICreateOfferPayload = {
                targetScope,
                storeID: form.storeIDs[0],
                storeIDs: form.storeIDs,
                salesChannels: form.salesChannels,
                discountType: form.discountType,
                value: requiresValue ? parsedValue : 0,
                description: form.name || form.brief || undefined,
                startDate: new Date(form.startDate || todayISO).toISOString(),
                endDate: form.hasPeriod && form.endDate ? new Date(form.endDate).toISOString() : undefined,
                isActive: form.isActive,
                scope: form.scope,
                exclusive: form.exclusive,
                priority: Number(form.priority) || 0,
                allowBelowMargin: form.allowBelowMargin,
            }

            if (targetScope === "VARIATION") {
                payload.storeProductID = form.storeProductID
            }

            if (targetScope === "PRODUCT" && form.discountType !== "BUNDLE") {
                payload.productIDs = form.productIDs
            }

            if (targetScope === "CATEGORY") {
                payload.categoryID = form.categoryID
                payload.includeSubcategories = form.includeSubcategories
            }

            if (targetScope === "BRAND") {
                payload.brand = form.brand
            }

            if (targetScope === "MODEL") {
                payload.model = form.model
            }

            if (form.discountType === "BUY_X_GET_Y") {
                payload.buyQuantity = selectedKind.buyQuantity ?? 2
                payload.payQuantity = selectedKind.payQuantity ?? 1
            }

            if (form.discountType === "BUNDLE") {
                payload.bundleItems = [
                    {
                        storeProductID: selectedProduct!.storeProductID,
                        productID: selectedProduct!.productID,
                        requiredQuantity: 1,
                    },
                    {
                        storeProductID: secondaryProduct?.storeProductID,
                        productID: secondaryProduct?.productID,
                        requiredQuantity: 1,
                    },
                ]
            }
            if (initialOffer?.offerID) {
                await updateOffer(initialOffer.offerID, payload)
                toast.success("Oferta actualizada correctamente")
                onOfferUpdated?.(form.storeProductID)
            } else {
                await createOffer(payload)
                toast.success("Oferta creada correctamente")
                onOfferCreated?.(form.storeProductID)
            }
            onClose()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar el descuento")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-xl overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl dark:bg-slate-950">
                <DialogHeader className="border-b border-slate-200 px-6 py-5 text-left dark:border-slate-800">
                    <DialogTitle className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                        <Tag className="h-4 w-4 text-amber-500" />
                        {editingOffer ? "Editar Descuento" : "Crear Descuento"}
                    </DialogTitle>
                </DialogHeader>

                <div className="max-h-[72vh] overflow-y-auto px-6 py-6">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Nombre del descuento
                            </Label>
                            <Input
                                value={form.name}
                                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                                placeholder="Ej: Rebajas de Invierno"
                                className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Tipo de descuento
                            </Label>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {discountKinds.map((kind) => (
                                    <button
                                        key={kind.id}
                                        type="button"
                                        onClick={() => handleKindSelect(kind)}
                                        className={`h-10 rounded-xl border px-3 text-left text-xs font-black uppercase transition ${
                                            form.kindID === kind.id
                                                ? "border-slate-950 bg-slate-950 text-white"
                                                : "border-slate-200 bg-white hover:border-slate-400"
                                        }`}
                                    >
                                        <span className={form.kindID === kind.id ? "text-white" : kind.tone}>
                                            {kind.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            {!selectedKind.supported && (
                                <p className="text-xs font-medium text-amber-700">
                                    Esto es mock: falta endpoint/reglas en backend para guardar este tipo.
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Descripción breve
                            </Label>
                            <Input
                                value={form.brief}
                                onChange={(event) => setForm((prev) => ({ ...prev, brief: event.target.value }))}
                                placeholder="Ej: Todo el stock de calzado"
                                className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                            />
                        </div>

                        {coverageOptions ? <DiscountCoverageField options={coverageOptions} channels={form.salesChannels}
                            storeIDs={form.storeIDs} singleStore={singleStore}
                            onChange={(salesChannels, storeIDs) => setForm((current) => ({
                                ...current, salesChannels, storeIDs,
                                ...(singleStore && selectedProduct?.storeID !== storeIDs[0] ? {
                                    storeProductID: options.find((option) => option.storeID === storeIDs[0])?.storeProductID ?? "",
                                } : {}),
                            }))} /> : <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
                            {coverageError ? <><p role="alert">No se pudieron cargar los canales y sucursales. {coverageError}</p>
                                <Button type="button" variant="outline" className="mt-2" onClick={() => setCoverageRevision((revision) => revision + 1)}>Reintentar</Button></>
                                : canManage ? "Cargando canales y sucursales..." : "Accede a una empresa con permisos de administración para gestionar descuentos."}
                        </div>}

                        {form.discountType !== "BUNDLE" && <section className="space-y-3" aria-label="Productos incluidos en el descuento">
                            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Aplicar a</h3>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {([
                                    ["CATEGORY", "Categoría"], ["BRAND", "Marca"], ["PRODUCT", "Productos específicos"],
                                    ...(form.discountType === "BUY_X_GET_Y" ? [] : [
                                        ["VARIATION", "Variante / talla"], ["STORE", "Toda la tienda"], ["MODEL", "Modelo"],
                                    ]),
                                ] as Array<[DiscountTargetScope, string]>).map(([target, label]) => <button key={target} type="button"
                                    aria-pressed={targetScope === target}
                                    onClick={() => setForm((current) => ({ ...current, targetScope: target,
                                        storeIDs: target === "VARIATION" ? current.storeIDs.slice(0, 1) : current.storeIDs }))}
                                    className={`rounded-xl border p-3 text-left text-xs font-semibold ${targetScope === target ? "border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200" : "border-slate-200 dark:border-slate-700"}`}>
                                    {label}
                                </button>)}
                            </div>
                            {form.discountType === "BUY_X_GET_Y" && <p className="rounded-lg bg-orange-50 p-3 text-xs leading-relaxed text-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
                                Por cada 2 unidades participantes se cobra la más cara y la más barata queda gratis. Puedes combinar productos distintos de la categoría, marca o selección elegida. Una unidad sin pareja se cobra a su precio correspondiente.
                            </p>}
                        </section>}

                        {targetScope === "PRODUCT" && form.discountType !== "BUNDLE" && <section className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Productos participantes</Label>
                            <Input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Buscar productos..." />
                            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                                {productTargets.filter((product) => normalizeSearchText(product.name).includes(normalizeSearchText(productQuery))).map((product) => <label key={product.productID} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <input type="checkbox" checked={form.productIDs.includes(product.productID)}
                                        onChange={(event) => setForm((current) => ({ ...current, productIDs: event.target.checked ? [...current.productIDs, product.productID] : current.productIDs.filter((id) => id !== product.productID) }))}
                                        className="h-4 w-4 accent-blue-600" />
                                    {product.name}
                                </label>)}
                                {productTargets.length === 0 && <p className="p-2 text-xs text-slate-500">No hay productos disponibles para seleccionar.</p>}
                            </div>
                            <p className="text-xs text-slate-500">{form.productIDs.length} seleccionados. Incluye todas sus tallas y variantes en las sucursales elegidas.</p>
                        </section>}

                        {needsVariant && <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                        Producto y variante
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Elige la variante de la sucursal seleccionada.
                                    </p>
                                </div>
                                {selectedProduct && (
                                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                                        Stock {selectedProduct.stockQuantity ?? 0}
                                    </span>
                                )}
                            </div>
                            <Popover open={isProductOpen} onOpenChange={setIsProductOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={isProductOpen}
                                        className="h-10 w-full justify-between rounded-xl border-slate-200 bg-white text-sm font-normal dark:border-slate-700 dark:bg-slate-950"
                                    >
                                        {selectedProduct
                                            ? `${selectedProduct.productName} - Talla ${selectedProduct.variationName}`
                                            : "Selecciona un producto"}
                                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-(--radix-popover-trigger-width) p-0"
                                    align="start"
                                    sideOffset={8}
                                >
                                    <Command shouldFilter={false}>
                                        <CommandInput
                                            placeholder="Buscar producto, talla o SKU..."
                                            value={productQuery}
                                            onValueChange={setProductQuery}
                                        />
                                        <CommandList>
                                            <CommandEmpty>No se encontraron productos.</CommandEmpty>
                                            <CommandGroup>
                                                {filteredOptions.map((option) => (
                                                    <CommandItem
                                                        key={option.storeProductID}
                                                        value={option.storeProductID}
                                                        onSelect={() => {
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                storeProductID: option.storeProductID,
                                                            }))
                                                            setIsProductOpen(false)
                                                        }}
                                                    >
                                                        <Check
                                                            className={`mr-2 h-4 w-4 ${form.storeProductID === option.storeProductID ? "opacity-100" : "opacity-0"}`}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span>{option.productName}</span>
                                                            <span className="text-xs text-slate-500">
                                                                Talla {option.variationName} - SKU {option.sku ?? "S/D"} -
                                                                {option.storeName}
                                                            </span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {selectedProduct && (
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                            Precio lista
                                        </p>
                                        <p className="text-sm font-bold text-slate-950 dark:text-white">
                                            {formatCurrency(selectedProduct.priceList)}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                            Tienda
                                        </p>
                                        <p className="text-sm font-bold text-slate-950 dark:text-white">
                                            {selectedProduct.storeName || "Sin tienda"}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </section>}

                        {targetScope === "CATEGORY" && (
                            <section className="grid gap-4 rounded-xl border border-orange-200 bg-orange-50/60 p-4 dark:border-orange-900 dark:bg-orange-950/20 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                        Categoria
                                    </Label>
                                    <select
                                        value={form.categoryID}
                                        onChange={(event) =>
                                            setForm((prev) => ({ ...prev, categoryID: event.target.value }))
                                        }
                                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                                    >
                                        <option value="">Selecciona categoria</option>
                                        {categoryOptions.map((category) => (
                                            <option key={category.categoryID} value={category.categoryID}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <label className="flex items-center gap-3 self-end text-xs font-bold uppercase tracking-wide text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={form.includeSubcategories}
                                        onChange={(event) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                includeSubcategories: event.target.checked,
                                            }))
                                        }
                                        className="h-4 w-4 rounded border-slate-300"
                                    />
                                    Incluir subcategorias
                                </label>
                            </section>
                        )}

                        {targetScope === "BRAND" && (
                            <section className="space-y-2 rounded-xl border border-cyan-200 bg-cyan-50/60 p-4 dark:border-cyan-900 dark:bg-cyan-950/20">
                                <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Marca</Label>
                                <select
                                    value={form.brand}
                                    onChange={(event) => setForm((prev) => ({ ...prev, brand: event.target.value }))}
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                                >
                                    <option value="">Selecciona marca</option>
                                    {brandOptions.map((brand) => (
                                        <option key={brand} value={brand}>
                                            {brand}
                                        </option>
                                    ))}
                                </select>
                            </section>
                        )}

                        {targetScope === "MODEL" && (
                            <section className="space-y-2 rounded-xl border border-pink-200 bg-pink-50/60 p-4 dark:border-pink-900 dark:bg-pink-950/20">
                                <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Modelo</Label>
                                <select
                                    value={form.model}
                                    onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))}
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                                >
                                    <option value="">Selecciona modelo</option>
                                    {modelOptions.map((model) => (
                                        <option key={model} value={model}>
                                            {model}
                                        </option>
                                    ))}
                                </select>
                            </section>
                        )}

                        {form.discountType === "BUNDLE" && (
                            <section className="space-y-2 rounded-xl border border-pink-200 bg-pink-50/60 p-4 dark:border-pink-900 dark:bg-pink-950/20">
                                <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Segundo producto del combo
                                </Label>
                                <select
                                    value={form.secondaryStoreProductID}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            secondaryStoreProductID: event.target.value,
                                        }))
                                    }
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                                >
                                    <option value="">Selecciona producto</option>
                                    {options
                                        .filter((option) => option.storeProductID !== form.storeProductID && option.storeID === form.storeIDs[0])
                                        .map((option) => (
                                            <option key={option.storeProductID} value={option.storeProductID}>
                                                {option.productName} - {option.variationName}
                                            </option>
                                        ))}
                                </select>
                            </section>
                        )}

                        <section className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Valor</Label>
                                {form.discountType === "FIXED_AMOUNT" || form.discountType === "FIXED_PRICE" ? (
                                    <CurrencyInput
                                        value={form.value}
                                        onValueChange={(value) => setForm((current) => ({ ...current, value }))}
                                        placeholder="$ 3.000"
                                        className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                                    />
                                ) : (
                                    <Input
                                        type="number"
                                        min={1}
                                        max={form.discountType === "PERCENTAGE" ? 100 : undefined}
                                        value={form.value}
                                        onChange={(event) => {
                                            let value = event.target.value
                                            if (value.includes("-")) return
                                            if (form.discountType === "PERCENTAGE" && parseFloat(value) > 100) value = "100"
                                            setForm((prev) => ({ ...prev, value }))
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key === "-" || event.key === "e" || event.key === "+") {
                                                event.preventDefault()
                                            }
                                        }}
                                        placeholder={
                                            form.discountType === "BUY_X_GET_Y" || form.discountType === "BUNDLE"
                                                ? "Opcional"
                                                : "Ej: 15"
                                        }
                                        className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                                    />
                                )}
                                {(form.discountType === "BUY_X_GET_Y" || form.discountType === "BUNDLE") && (
                                    <p className="text-xs text-slate-500">
                                        La promoción usa las cantidades de los productos; no necesitas ingresar un valor.
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Estado
                                </Label>
                                <button
                                    type="button"
                                    onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                                    className={`h-10 w-full rounded-xl border px-3 text-left text-sm font-bold ${
                                        form.isActive
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                            : "border-slate-200 bg-slate-100 text-slate-600"
                                    }`}
                                >
                                    {form.isActive ? "Activa" : "Pausada"}
                                </button>
                            </div>
                        </section>

                        <section className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Prioridad
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={form.priority}
                                    onChange={(event) =>
                                        setForm((prev) => ({ ...prev, priority: event.target.value }))
                                    }
                                    className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                                />
                            </div>
                            <label className="flex items-center gap-3 self-end text-xs font-bold uppercase tracking-wide text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={form.allowBelowMargin}
                                    onChange={(event) =>
                                        setForm((prev) => ({ ...prev, allowBelowMargin: event.target.checked }))
                                    }
                                    className="h-4 w-4 rounded border-slate-300"
                                />
                                Permitir bajo margen
                            </label>
                        </section>

                        <label className="flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                            <input
                                type="checkbox"
                                checked={form.hasPeriod}
                                onChange={(event) =>
                                    setForm((prev) => ({ ...prev, hasPeriod: event.target.checked }))
                                }
                                className="h-4 w-4 rounded border-slate-300"
                            />
                            Definir periodo de vigencia
                        </label>

                        {form.hasPeriod && (
                            <section className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                        Fecha inicio
                                    </Label>
                                    <Input
                                        type="date"
                                        value={form.startDate}
                                        onChange={(event) =>
                                            setForm((prev) => ({ ...prev, startDate: event.target.value }))
                                        }
                                        className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                        Fecha fin
                                    </Label>
                                    <Input
                                        type="date"
                                        value={form.endDate}
                                        onChange={(event) =>
                                            setForm((prev) => ({ ...prev, endDate: event.target.value }))
                                        }
                                        className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                                    />
                                </div>
                            </section>
                        )}

                        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                            <input
                                type="checkbox"
                                checked={form.exclusive}
                                onChange={(event) =>
                                    setForm((prev) => ({ ...prev, exclusive: event.target.checked }))
                                }
                                className="mt-0.5 h-4 w-4 rounded border-slate-300"
                            />
                            <span>
                                <span className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                                    Oferta exclusiva
                                </span>
                                <span className="block text-xs text-slate-500">
                                    Evita combinaciones con otras promociones.
                                </span>
                            </span>
                        </label>
                    </div>
                </div>

                <DialogFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !canManage || !coverageOptions || !form.salesChannels.length || !form.storeIDs.length}
                        className="bg-blue-950 text-white hover:bg-blue-900"
                    >
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {actionLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
