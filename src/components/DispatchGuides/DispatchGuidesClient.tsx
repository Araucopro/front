"use client"

import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
    AlertCircle,
    CalendarDays,
    Download,
    Eye,
    FileText,
    LoaderCircle,
    Plus,
    RefreshCw,
    RotateCcw,
    Search,
    Trash2,
    Truck,
} from "lucide-react"
import { toast } from "sonner"
import { getClients } from "@/actions/clients/getClients"
import { anularDispatchGuide } from "@/actions/dispatch-guides/anularDispatchGuide"
import { getDispatchGuidePage } from "@/actions/dispatch-guides/getDispatchGuides"
import { createDispatchGuide } from "@/actions/dispatch-guides/postDispatchGuide"
import { reconcileDispatchGuide } from "@/actions/dispatch-guides/reconcileDispatchGuide"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { IClient } from "@/interfaces/clients/IClient"
import type {
    DispatchGuideStatus,
    DispatchGuideTransferIndicator,
    ICreateDispatchGuide,
    IDispatchGuideListFilters,
    IDispatchGuideListMeta,
    IDispatchGuideOperationResponse,
    IDispatchGuideReceiver,
    IDispatchGuideTransport,
} from "@/interfaces/dispatch-guides/IDispatchGuide"
import type { IProduct } from "@/interfaces/products/IProduct"
import type { IProductVariation, IStoreProduct } from "@/interfaces/products/IProductVariation"
import { useTienda } from "@/stores/tienda.store"
import { getChileYYYYMMDD } from "@/utils/chile-date"
import { toPrice } from "@/utils/priceFormat"

type StatusFilter = DispatchGuideStatus | "TODOS"

type GuideCartItem = {
    storeProductID: string
    variationID: string
    productName: string
    productImage?: string | null
    sku: string
    sizeNumber: string
    priceList: number
    quantity: number
    stockQuantity: number
}

type ProductOption = {
    product: IProduct
    variation: IProductVariation
    storeProduct: IStoreProduct
    stockQuantity: number
    priceList: number
    searchText: string
}

type DispatchGuidesClientProps = {
    initialGuides: IDispatchGuideOperationResponse[]
    initialMeta: IDispatchGuideListMeta
    initialProducts: IProduct[]
    initialClients: IClient[]
    initialStoreID?: string
    initialFilters?: IDispatchGuideListFilters
}

const transferIndicatorLabels: Record<DispatchGuideTransferIndicator, string> = {
    "1": "Venta",
    "2": "Venta por encargo",
    "3": "Consignacion",
    "4": "Entrega gratuita",
    "5": "Traslado interno",
}

const statusLabels: Record<DispatchGuideStatus, string> = {
    PENDIENTE: "Pendiente",
    EMITIDA: "Emitida",
    ANULACION_PENDIENTE: "Anulacion pendiente",
    ANULADA: "Anulada",
}

const statusClassName = (status: DispatchGuideStatus) => {
    if (status === "EMITIDA") {
        return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
    }
    if (status === "PENDIENTE" || status === "ANULACION_PENDIENTE") {
        return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
    }
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
}

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Santiago",
})

const normalizeSearchText = (value: string) =>
    value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/gi, " ")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim()

const normalizeSku = (value: string) => value.trim().toLowerCase()

const toNumber = (value: unknown) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

const resolveStoreProductStoreId = (storeProduct: IStoreProduct) =>
    storeProduct.storeID || storeProduct.Store?.storeID

const findStoreProductForStore = (variation: IProductVariation, storeID: string) => {
    if (!storeID) return undefined
    return variation.StoreProducts?.find((storeProduct) => resolveStoreProductStoreId(storeProduct) === storeID)
}

const getStoreProductStock = (storeProduct?: IStoreProduct) => {
    if (!storeProduct) return 0
    return toNumber(storeProduct.quantity)
}

const getStoreProductPrice = (variation: IProductVariation, storeProduct: IStoreProduct) =>
    toNumber(storeProduct.finalPrice ?? storeProduct.priceListStore ?? variation.priceList)

const buildSearchText = (product: IProduct, variation: IProductVariation) =>
    normalizeSearchText(
        [product.name, product.brand, product.Category?.name, product.genre, variation.sku, variation.sizeNumber]
            .filter(Boolean)
            .join(" "),
    )

const buildClientSearchText = (client: IClient) =>
    normalizeSearchText(
        [client.clientID, client.rut, client.name, client.giro, client.email, client.address, client.city]
            .filter(Boolean)
            .join(" "),
    )

const mergeClientsById = (current: IClient[], next: IClient[]) => {
    const clientsById = new Map(current.map((client) => [client.clientID, client]))
    for (const client of next) {
        clientsById.set(client.clientID, client)
    }
    return Array.from(clientsById.values())
}

const formatDate = (value?: string) => {
    if (!value) return "Sin fecha"
    const date = new Date(`${value}T12:00:00`)
    return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

const emptyReceiver: IDispatchGuideReceiver = {
    rut: "",
    name: "",
    address: "",
    city: "",
    giro: "",
    email: "",
}

const emptyTransport: IDispatchGuideTransport = {
    patente: "",
    rutConductor: "",
    nombreConductor: "",
    fechaTraslado: "",
}

const hasText = (value?: string) => Boolean(value?.trim())

export default function DispatchGuidesClient({
    initialGuides,
    initialMeta,
    initialProducts,
    initialClients,
    initialStoreID = "",
    initialFilters = {},
}: DispatchGuidesClientProps) {
    const router = useRouter()
    const { storeSelected } = useTienda()
    const effectiveStoreID = storeSelected?.storeID ?? initialStoreID

    const [guides, setGuides] = useState(initialGuides)
    const [meta, setMeta] = useState(initialMeta)
    const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilters.status ?? "TODOS")
    const [fromFilter, setFromFilter] = useState(initialFilters.from ?? "")
    const [toFilter, setToFilter] = useState(initialFilters.to ?? "")
    const [loadingList, setLoadingList] = useState(false)
    const [openCreate, setOpenCreate] = useState(false)
    const [selectedGuide, setSelectedGuide] = useState<IDispatchGuideOperationResponse | null>(null)
    const [pendingActionID, setPendingActionID] = useState<string | null>(null)

    const [productInput, setProductInput] = useState("")
    const [clientInput, setClientInput] = useState("")
    const [clientOptions, setClientOptions] = useState(initialClients)
    const [loadingClients, setLoadingClients] = useState(false)
    const [cartItems, setCartItems] = useState<GuideCartItem[]>([])
    const [receiver, setReceiver] = useState<IDispatchGuideReceiver>(emptyReceiver)
    const [destination, setDestination] = useState({ address: "", city: "" })
    const [transport, setTransport] = useState<IDispatchGuideTransport>(emptyTransport)
    const [clientID, setClientID] = useState("")
    const [includePrices, setIncludePrices] = useState(true)
    const [manualDiscount, setManualDiscount] = useState("0")
    const [issueDate, setIssueDate] = useState(() => getChileYYYYMMDD(new Date()))
    const [indTraslado, setIndTraslado] = useState<DispatchGuideTransferIndicator>("1")
    const [creating, setCreating] = useState(false)

    const storeOptions = useMemo<ProductOption[]>(() => {
        if (!Array.isArray(initialProducts) || !effectiveStoreID) return []

        const options: ProductOption[] = []
        for (const product of initialProducts) {
            for (const variation of product.ProductVariations || []) {
                const storeProduct = findStoreProductForStore(variation, effectiveStoreID)
                if (!storeProduct) continue

                const stockQuantity = getStoreProductStock(storeProduct)
                if (stockQuantity <= 0) continue

                options.push({
                    product,
                    variation,
                    storeProduct,
                    stockQuantity,
                    priceList: getStoreProductPrice(variation, storeProduct),
                    searchText: buildSearchText(product, variation),
                })
            }
        }

        return options
    }, [effectiveStoreID, initialProducts])

    const normalizedQuery = useMemo(() => normalizeSearchText(productInput), [productInput])
    const normalizedClientQuery = useMemo(() => normalizeSearchText(clientInput), [clientInput])

    const searchResults = useMemo(() => {
        if (normalizedQuery.length < 2) return []

        const tokens = normalizedQuery.split(" ").filter(Boolean)
        return storeOptions
            .filter((option) => tokens.every((token) => option.searchText.includes(token)))
            .slice(0, 20)
    }, [normalizedQuery, storeOptions])

    const clientSearchResults = useMemo(() => {
        if (normalizedClientQuery.length < 2) return []

        const tokens = normalizedClientQuery.split(" ").filter(Boolean)
        return clientOptions
            .filter((client) => tokens.every((token) => buildClientSearchText(client).includes(token)))
            .slice(0, 10)
    }, [clientOptions, normalizedClientQuery])

    const cartTotal = useMemo(
        () => cartItems.reduce((sum, item) => sum + item.quantity * item.priceList, 0),
        [cartItems],
    )

    const currentFilters: IDispatchGuideListFilters = {
        status: statusFilter === "TODOS" ? undefined : statusFilter,
        from: fromFilter || undefined,
        to: toFilter || undefined,
        page: 1,
        limit: meta.limit || 50,
    }

    const loadGuides = async (filters: IDispatchGuideListFilters = currentFilters) => {
        if (!effectiveStoreID) {
            setGuides([])
            setMeta({ page: 1, limit: filters.limit ?? 50, total: 0 })
            return
        }

        try {
            setLoadingList(true)
            const response = await getDispatchGuidePage(effectiveStoreID, filters)
            setGuides(response.dispatchGuides)
            setMeta(response.meta)
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudieron cargar las guias"
            toast.error(message)
        } finally {
            setLoadingList(false)
        }
    }

    const resetCreateForm = () => {
        setProductInput("")
        setClientInput("")
        setCartItems([])
        setReceiver(emptyReceiver)
        setDestination({ address: "", city: "" })
        setTransport(emptyTransport)
        setClientID("")
        setIncludePrices(true)
        setManualDiscount("0")
        setIssueDate(getChileYYYYMMDD(new Date()))
        setIndTraslado("1")
    }

    const handleCreateDialogOpenChange = (nextOpen: boolean) => {
        if (nextOpen) {
            resetCreateForm()
        }
        setOpenCreate(nextOpen)
    }

    const handleClientInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        setClientInput(event.target.value)
        setClientID("")
    }

    const selectClient = (client: IClient) => {
        setClientID(client.clientID)
        setClientInput(`${client.name} - ${client.rut}`)
        setReceiver({
            rut: client.rut,
            name: client.name,
            address: client.address ?? "",
            city: client.city ?? "",
            giro: client.giro ?? "",
            email: client.email ?? "",
        })
        setDestination((current) => ({
            address: current.address || client.address || "",
            city: current.city || client.city || "",
        }))
    }

    const handleClientEnterPressed = (event: KeyboardEvent<HTMLInputElement>) => {
        const isEnterPress = event.key === "Enter" || event.key === "NumpadEnter"
        if (!isEnterPress) return

        event.preventDefault()
        if (clientSearchResults.length === 1) {
            selectClient(clientSearchResults[0])
            return
        }

        if (clientSearchResults.length > 1) {
            toast.message("Selecciona un cliente de la lista")
        }
    }

    const addSearchOption = (option: ProductOption) => {
        setCartItems((current) => {
            const existing = current.find((item) => item.storeProductID === option.storeProduct.storeProductID)
            if (existing) {
                if (existing.quantity + 1 > existing.stockQuantity) {
                    toast.error("Stock insuficiente para agregar mas unidades")
                    return current
                }

                return current.map((item) =>
                    item.storeProductID === existing.storeProductID
                        ? { ...item, quantity: item.quantity + 1 }
                        : item,
                )
            }

            return [
                ...current,
                {
                    storeProductID: option.storeProduct.storeProductID,
                    variationID: option.variation.variationID,
                    productName: option.product.name,
                    productImage: option.product.image,
                    sku: option.variation.sku,
                    sizeNumber: option.variation.sizeNumber,
                    priceList: option.priceList,
                    quantity: 1,
                    stockQuantity: option.stockQuantity,
                },
            ]
        })
        setProductInput("")
    }

    const handleEnterPressed = (event: KeyboardEvent<HTMLInputElement>) => {
        const isEnterPress = event.key === "Enter" || event.key === "NumpadEnter"
        if (!isEnterPress) return

        event.preventDefault()
        if (!effectiveStoreID) {
            toast.error("No hay tienda seleccionada")
            return
        }

        const query = productInput.trim()
        if (!query) return

        const exactSku = storeOptions.find((option) => normalizeSku(option.variation.sku) === normalizeSku(query))
        if (exactSku) {
            addSearchOption(exactSku)
            return
        }

        if (searchResults.length === 1) {
            addSearchOption(searchResults[0])
            return
        }

        if (searchResults.length > 1) {
            toast.message("Selecciona una variante de la lista")
            return
        }

        toast.error(`No se encontro producto con stock: ${query}`)
    }

    const updateQuantity = (storeProductID: string, quantity: number) => {
        setCartItems((current) =>
            current.map((item) =>
                item.storeProductID === storeProductID
                    ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stockQuantity)) }
                    : item,
            ),
        )
    }

    const removeCartItem = (storeProductID: string) => {
        setCartItems((current) => current.filter((item) => item.storeProductID !== storeProductID))
    }

    const validateCreatePayload = () => {
        if (!effectiveStoreID) return "Selecciona una tienda antes de emitir la guia"
        if (cartItems.length === 0) return "Agrega al menos un producto a la guia"
        if (!hasText(destination.address) || !hasText(destination.city)) {
            return "Completa direccion y ciudad de destino"
        }
        if (!hasText(receiver.rut) || !hasText(receiver.name)) {
            return "Completa RUT y razon social del receptor"
        }
        if (!hasText(receiver.address) || !hasText(receiver.city) || !hasText(receiver.giro)) {
            return "Completa direccion, ciudad y giro del receptor"
        }
        if (receiver.email?.trim() && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(receiver.email.trim())) {
            return "Ingresa un correo valido para el receptor"
        }
        if (manualDiscount) {
            const discount = Number(manualDiscount)
            if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
                return "El descuento manual debe estar entre 0 y 100"
            }
        }

        return null
    }

    const buildCreatePayload = (): ICreateDispatchGuide => {
        const discount = Number(manualDiscount)
        const trimmedTransport = Object.fromEntries(
            Object.entries({
                patente: transport.patente?.trim(),
                rutConductor: transport.rutConductor?.trim(),
                nombreConductor: transport.nombreConductor?.trim(),
                fechaTraslado: transport.fechaTraslado?.trim(),
            }).filter(([, value]) => Boolean(value)),
        ) as IDispatchGuideTransport
        const shouldSendTransport = Object.values(trimmedTransport).some(Boolean)

        return {
            items: cartItems.map((item) => ({
                storeProductID: item.storeProductID,
                quantity: item.quantity,
            })),
            receiver: {
                rut: receiver.rut.trim(),
                name: receiver.name.trim(),
                address: receiver.address.trim(),
                city: receiver.city.trim(),
                giro: receiver.giro.trim(),
                ...(receiver.email?.trim() ? { email: receiver.email.trim() } : {}),
            },
            destination: {
                address: destination.address.trim(),
                city: destination.city.trim(),
            },
            ...(clientID.trim() ? { clientID: clientID.trim() } : {}),
            issueDate: getChileYYYYMMDD(new Date()),
            indTraslado,
            includePrices,
            ...(Number.isFinite(discount) && discount > 0 ? { manualDiscount: discount } : {}),
            ...(shouldSendTransport ? { transport: trimmedTransport } : {}),
        }
    }

    const handleCreate = async () => {
        const validationMessage = validateCreatePayload()
        if (validationMessage) {
            toast.error(validationMessage)
            return
        }

        try {
            setCreating(true)
            const response = await createDispatchGuide(effectiveStoreID, buildCreatePayload())
            toast.success(
                response.dte?.STATUS === "EMITIDO"
                    ? "Guia de despacho emitida"
                    : "Guia creada y pendiente de emision",
            )
            setOpenCreate(false)
            resetCreateForm()
            await loadGuides()
            router.refresh()
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudo crear la guia de despacho"
            toast.error(message)
        } finally {
            setCreating(false)
        }
    }

    const handleReconcile = async (guide: IDispatchGuideOperationResponse) => {
        const id = guide.dispatchGuide.dispatchGuideID
        try {
            setPendingActionID(id)
            const response = await reconcileDispatchGuide(id, effectiveStoreID)
            setGuides((current) =>
                current.map((item) =>
                    item.dispatchGuide.dispatchGuideID === id ? response : item,
                ),
            )
            toast.success("Guia reconciliada")
            router.refresh()
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudo reconciliar la guia"
            toast.error(message)
        } finally {
            setPendingActionID(null)
        }
    }

    const handleAnular = async (guide: IDispatchGuideOperationResponse) => {
        const id = guide.dispatchGuide.dispatchGuideID
        const confirmed = window.confirm("Anular esta guia de despacho? Esta accion revertira el stock reservado si el backend confirma la anulacion.")
        if (!confirmed) return

        try {
            setPendingActionID(id)
            const response = await anularDispatchGuide(id, effectiveStoreID)
            setGuides((current) =>
                current.map((item) =>
                    item.dispatchGuide.dispatchGuideID === id ? response : item,
                ),
            )
            toast.success("Solicitud de anulacion procesada")
            router.refresh()
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudo anular la guia"
            toast.error(message)
        } finally {
            setPendingActionID(null)
        }
    }

    const handleFilterSubmit = async () => {
        await loadGuides(currentFilters)
    }

    function setReceiverField(field: keyof IDispatchGuideReceiver, event: ChangeEvent<HTMLInputElement>) {
        const { value } = event.target
        setReceiver((current) => ({ ...current, [field]: value }))
    }

    function setTransportField(field: keyof IDispatchGuideTransport, event: ChangeEvent<HTMLInputElement>) {
        const { value } = event.target
        setTransport((current) => ({ ...current, [field]: value }))
    }

    useEffect(() => {
        const query = clientInput.trim()
        if (query.length < 2 || clientID) {
            setLoadingClients(false)
            return
        }

        setLoadingClients(true)
        const timeoutID = window.setTimeout(async () => {
            try {
                const response = await getClients({ page: 1, limit: 10, search: query })
                setClientOptions((current) => mergeClientsById(current, response.clients))
            } catch (error) {
                console.warn("DispatchGuidesClient: client search failed:", error)
            } finally {
                setLoadingClients(false)
            }
        }, 300)

        return () => window.clearTimeout(timeoutID)
    }, [clientID, clientInput])

    useEffect(() => {
        if (!effectiveStoreID || effectiveStoreID === initialStoreID) return
        void loadGuides({
            ...currentFilters,
            page: 1,
        })
        // Se ejecuta al cambiar la tienda efectiva; los filtros actuales se leen del render vigente.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveStoreID, initialStoreID])

    const hasProductResults = normalizedQuery.length >= 2 && productInput.trim() !== ""
    const hasClientResults = normalizedClientQuery.length >= 2 && clientInput.trim() !== "" && !clientID

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-5">
            <section className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                        <Truck className="h-4 w-4 text-blue-500" />
                        DTE 52
                    </div>
                    <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">Guias de despacho</h1>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        Emision Haulmer, reserva de stock y seguimiento por estado.
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => loadGuides()}
                        disabled={loadingList}
                    >
                        {loadingList ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
                        Actualizar
                    </Button>
                    <Button type="button" onClick={() => handleCreateDialogOpenChange(true)} disabled={!effectiveStoreID}>
                        <Plus />
                        Nueva guia
                    </Button>
                </div>
            </section>

            {!effectiveStoreID && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    Selecciona una tienda para listar y emitir guias de despacho.
                </div>
            )}

            <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[1fr_1fr_1fr_auto]">
                <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TODOS">Todos</SelectItem>
                            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                            <SelectItem value="EMITIDA">Emitida</SelectItem>
                            <SelectItem value="ANULACION_PENDIENTE">Anulacion pendiente</SelectItem>
                            <SelectItem value="ANULADA">Anulada</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Desde</Label>
                    <Input type="date" value={fromFilter} onChange={(event) => setFromFilter(event.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Hasta</Label>
                    <Input type="date" value={toFilter} onChange={(event) => setToFilter(event.target.value)} />
                </div>
                <div className="flex items-end">
                    <Button type="button" className="w-full" onClick={handleFilterSubmit} disabled={loadingList}>
                        {loadingList ? <LoaderCircle className="animate-spin" /> : <CalendarDays />}
                        Filtrar
                    </Button>
                </div>
            </section>

            <section className="min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-950">
                            <TableHead>Folio</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Receptor</TableHead>
                            <TableHead>Traslado</TableHead>
                            <TableHead className="text-right">Items</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="w-[168px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {guides.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="py-12 text-center text-sm text-slate-500">
                                    No hay guias de despacho para los filtros seleccionados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            guides.map((operation) => {
                                const guide = operation.dispatchGuide
                                const isPendingAction = pendingActionID === guide.dispatchGuideID
                                const itemUnits = guide.items.reduce((sum, item) => sum + toNumber(item.quantity), 0)
                                const canReconcile =
                                    guide.status === "PENDIENTE" || guide.status === "ANULACION_PENDIENTE"
                                const canAnular = guide.status === "PENDIENTE" || guide.status === "EMITIDA"
                                const folio = operation.dte?.FOLIO ?? guide.folio

                                return (
                                    <TableRow key={guide.dispatchGuideID} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                        <TableCell className="font-semibold">
                                            {folio ? `#${folio}` : "Sin folio"}
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                                            {formatDate(guide.issueDate)}
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {guide.receiver?.name || "Sin receptor"}
                                            </p>
                                            <p className="text-xs text-slate-500">{guide.receiver?.rut}</p>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {transferIndicatorLabels[guide.indTraslado] ?? guide.indTraslado}
                                        </TableCell>
                                        <TableCell className="text-right">{itemUnits}</TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {guide.includePrices ? `$${toPrice(guide.total)}` : "Sin precios"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={statusClassName(guide.status)}>
                                                {statusLabels[guide.status] ?? guide.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    title="Ver detalle"
                                                    onClick={() => setSelectedGuide(operation)}
                                                >
                                                    <Eye />
                                                </Button>
                                                {canReconcile && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        title="Reconciliar"
                                                        onClick={() => handleReconcile(operation)}
                                                        disabled={isPendingAction}
                                                    >
                                                        {isPendingAction ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
                                                    </Button>
                                                )}
                                                {canAnular && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        title="Anular"
                                                        onClick={() => handleAnular(operation)}
                                                        disabled={isPendingAction}
                                                        className="text-rose-600 hover:text-rose-700"
                                                    >
                                                        {isPendingAction ? <LoaderCircle className="animate-spin" /> : <RotateCcw />}
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </section>

            <div className="text-sm text-slate-500">
                Mostrando {guides.length} de {meta.total} guias.
            </div>

            <Dialog open={openCreate} onOpenChange={handleCreateDialogOpenChange}>
                <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto p-6">
                    <DialogHeader>
                        <DialogTitle>Nueva guia de despacho</DialogTitle>
                        <DialogDescription>
                            Los items reservan stock y el backend emite el DTE 52 con Haulmer.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-5 grid gap-5">
                        <section className="grid gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700 lg:grid-cols-4">
                            <div className="space-y-2">
                                <Label>Fecha emision</Label>
                                <Input
                                    type="date"
                                    value={issueDate}
                                    disabled
                                    aria-readonly="true"
                                    className="cursor-default opacity-100 disabled:cursor-default disabled:opacity-100"
                                />
                            </div>
                            <div className="space-y-2 lg:col-span-2">
                                <Label>Indicador de traslado</Label>
                                <Select
                                    value={indTraslado}
                                    onValueChange={(value: DispatchGuideTransferIndicator) => setIndTraslado(value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 - Venta</SelectItem>
                                        <SelectItem value="2">2 - Venta por encargo</SelectItem>
                                        <SelectItem value="3">3 - Consignacion</SelectItem>
                                        <SelectItem value="4">4 - Entrega gratuita</SelectItem>
                                        <SelectItem value="5">5 - Traslado interno</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Descuento %</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={manualDiscount}
                                    onChange={(event) => setManualDiscount(event.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-3 lg:col-span-4">
                                <Checkbox
                                    checked={includePrices}
                                    onCheckedChange={(checked) => setIncludePrices(checked === true)}
                                    id="include-prices"
                                />
                                <Label htmlFor="include-prices" className="cursor-pointer">
                                    Emitir guia con precios
                                </Label>
                            </div>
                        </section>

                        <section className="grid gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700 lg:grid-cols-3">
                            <div className="space-y-2">
                                <Label>RUT receptor</Label>
                                <Input value={receiver.rut} onChange={(event) => setReceiverField("rut", event)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Razon social</Label>
                                <Input value={receiver.name} onChange={(event) => setReceiverField("name", event)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Correo</Label>
                                <Input type="email" value={receiver.email ?? ""} onChange={(event) => setReceiverField("email", event)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Giro</Label>
                                <Input value={receiver.giro} onChange={(event) => setReceiverField("giro", event)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Direccion receptor</Label>
                                <Input value={receiver.address} onChange={(event) => setReceiverField("address", event)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Ciudad receptor</Label>
                                <Input value={receiver.city} onChange={(event) => setReceiverField("city", event)} />
                            </div>
                            <div className="space-y-2 lg:col-span-3">
                                <Label>Cliente registrado</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500" />
                                    <Input
                                        value={clientInput}
                                        onChange={handleClientInputChange}
                                        onKeyDown={handleClientEnterPressed}
                                        placeholder="Buscar por nombre, RUT o ID..."
                                        className="pl-9"
                                    />
                                    {hasClientResults && (
                                        <ul className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                                            {clientSearchResults.length > 0 ? (
                                                clientSearchResults.map((client) => (
                                                    <li key={client.clientID}>
                                                        <button
                                                            type="button"
                                                            className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-blue-50 dark:hover:bg-slate-700"
                                                            onClick={() => selectClient(client)}
                                                        >
                                                            <span className="min-w-0">
                                                                <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                                                                    {client.name}
                                                                </span>
                                                                <span className="block truncate text-xs text-slate-500">
                                                                    RUT {client.rut} - ID {client.clientID}
                                                                </span>
                                                            </span>
                                                            <span className="text-xs font-semibold text-slate-500">
                                                                {client.segment === "WHOLESALE" ? "Mayorista" : "Retail"}
                                                            </span>
                                                        </button>
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="p-3 text-sm text-slate-500">
                                                    {loadingClients ? "Buscando clientes..." : "Sin clientes para esta busqueda"}
                                                </li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                                {clientID && (
                                    <p className="text-xs text-slate-500">
                                        ID seleccionado: <span className="font-mono">{clientID}</span>
                                    </p>
                                )}
                            </div>
                        </section>

                        <section className="grid gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700 lg:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Direccion destino</Label>
                                <Input
                                    value={destination.address}
                                    onChange={(event) =>
                                        setDestination((current) => ({ ...current, address: event.target.value }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Ciudad destino</Label>
                                <Input
                                    value={destination.city}
                                    onChange={(event) =>
                                        setDestination((current) => ({ ...current, city: event.target.value }))
                                    }
                                />
                            </div>
                        </section>

                        <section className="grid gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700 lg:grid-cols-4">
                            <div className="space-y-2">
                                <Label>Patente</Label>
                                <Input value={transport.patente ?? ""} onChange={(event) => setTransportField("patente", event)} />
                            </div>
                            <div className="space-y-2">
                                <Label>RUT conductor</Label>
                                <Input
                                    value={transport.rutConductor ?? ""}
                                    onChange={(event) => setTransportField("rutConductor", event)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nombre conductor</Label>
                                <Input
                                    value={transport.nombreConductor ?? ""}
                                    onChange={(event) => setTransportField("nombreConductor", event)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha traslado</Label>
                                <Input
                                    type="date"
                                    value={transport.fechaTraslado ?? ""}
                                    onChange={(event) => setTransportField("fechaTraslado", event)}
                                />
                            </div>
                        </section>

                        <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="font-semibold text-slate-900 dark:text-white">Items</h3>
                                    <p className="text-xs text-slate-500">Busca por SKU, nombre, marca o talla.</p>
                                </div>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    Total estimado: {includePrices ? `$${toPrice(cartTotal)}` : "sin precios"}
                                </p>
                            </div>
                            <div className="relative mb-4">
                                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500" />
                                <Input
                                    value={productInput}
                                    onChange={(event) => setProductInput(event.target.value)}
                                    onKeyDown={handleEnterPressed}
                                    placeholder="Codigo de barras o producto..."
                                    className="h-11 pl-11"
                                />
                                {hasProductResults && (
                                    <ul className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                                        {searchResults.length > 0 ? (
                                            searchResults.map((option) => (
                                                <li key={option.storeProduct.storeProductID}>
                                                    <button
                                                        type="button"
                                                        className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-blue-50 dark:hover:bg-slate-700"
                                                        onClick={() => addSearchOption(option)}
                                                    >
                                                        <span>
                                                            <span className="block text-sm font-medium text-slate-900 dark:text-white">
                                                                {option.product.name} - {option.variation.sizeNumber}
                                                            </span>
                                                            <span className="block text-xs text-slate-500">
                                                                SKU {option.variation.sku} - Stock {option.stockQuantity}
                                                            </span>
                                                        </span>
                                                        <span className="text-sm font-semibold">${toPrice(option.priceList)}</span>
                                                    </button>
                                                </li>
                                            ))
                                        ) : (
                                            <li className="p-3 text-sm text-slate-500">
                                                Sin productos con stock para esta busqueda
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </div>

                            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead className="text-center">Cantidad</TableHead>
                                            <TableHead className="text-right">Precio</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                            <TableHead className="w-12" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cartItems.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-500">
                                                    Agrega productos para emitir la guia.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            cartItems.map((item) => (
                                                <TableRow key={item.storeProductID}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            {item.productImage && (
                                                                <Image
                                                                    src={item.productImage}
                                                                    alt={item.productName}
                                                                    width={40}
                                                                    height={40}
                                                                    className="h-10 w-10 rounded object-cover"
                                                                />
                                                            )}
                                                            <div>
                                                                <p className="font-medium">{item.productName} - {item.sizeNumber}</p>
                                                                <p className="text-xs text-slate-500">SKU {item.sku}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-center">
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                max={item.stockQuantity}
                                                                value={item.quantity}
                                                                onChange={(event) =>
                                                                    updateQuantity(item.storeProductID, Number(event.target.value))
                                                                }
                                                                className="w-20 text-center"
                                                            />
                                                        </div>
                                                        <p className="mt-1 text-center text-xs text-slate-500">
                                                            Stock: {item.stockQuantity}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {includePrices ? `$${toPrice(item.priceList)}` : "-"}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {includePrices ? `$${toPrice(item.priceList * item.quantity)}` : "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Eliminar"
                                                            onClick={() => removeCartItem(item.storeProductID)}
                                                        >
                                                            <Trash2 className="text-rose-600" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </section>

                        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-700 sm:flex-row sm:justify-end">
                            <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                                Cancelar
                            </Button>
                            <Button type="button" onClick={handleCreate} disabled={creating}>
                                {creating ? <LoaderCircle className="animate-spin" /> : <FileText />}
                                Emitir guia
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(selectedGuide)} onOpenChange={(open) => !open && setSelectedGuide(null)}>
                <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-6">
                    {selectedGuide && (
                        <>
                            <DialogHeader>
                                <DialogTitle>
                                    Guia {selectedGuide.dte?.FOLIO ?? selectedGuide.dispatchGuide.folio ?? "sin folio"}
                                </DialogTitle>
                                <DialogDescription>
                                    Emitida el {formatDate(selectedGuide.dispatchGuide.issueDate)} para{" "}
                                    {selectedGuide.dispatchGuide.receiver?.name ?? "receptor sin nombre"}.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="mt-5 grid gap-4">
                                <div className="grid gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700 sm:grid-cols-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">Estado</p>
                                        <Badge variant="outline" className={statusClassName(selectedGuide.dispatchGuide.status)}>
                                            {statusLabels[selectedGuide.dispatchGuide.status]}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">DTE</p>
                                        <p className="text-sm font-medium">{selectedGuide.dte?.STATUS ?? "Sin DTE"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">Total</p>
                                        <p className="text-sm font-medium">
                                            {selectedGuide.dispatchGuide.includePrices
                                                ? `$${toPrice(selectedGuide.dispatchGuide.total)}`
                                                : "Sin precios"}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700 sm:grid-cols-2">
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">Receptor</p>
                                        <p className="text-sm font-medium">{selectedGuide.dispatchGuide.receiver?.name}</p>
                                        <p className="text-sm text-slate-500">{selectedGuide.dispatchGuide.receiver?.rut}</p>
                                        <p className="text-sm text-slate-500">
                                            {selectedGuide.dispatchGuide.receiver?.address},{" "}
                                            {selectedGuide.dispatchGuide.receiver?.city}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">Destino</p>
                                        <p className="text-sm font-medium">{selectedGuide.dispatchGuide.destination.address}</p>
                                        <p className="text-sm text-slate-500">{selectedGuide.dispatchGuide.destination.city}</p>
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Producto</TableHead>
                                                <TableHead className="text-right">Cantidad</TableHead>
                                                <TableHead className="text-right">Total linea</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedGuide.dispatchGuide.items.map((item) => (
                                                <TableRow key={item.dispatchGuideItemID}>
                                                    <TableCell>
                                                        <p className="font-medium">{item.productName}</p>
                                                        <p className="text-xs text-slate-500">SKU {item.sku}</p>
                                                    </TableCell>
                                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                                    <TableCell className="text-right">
                                                        {selectedGuide.dispatchGuide.includePrices
                                                            ? `$${toPrice(item.lineTotal)}`
                                                            : "-"}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {(selectedGuide.dte?.PDF || selectedGuide.dte?.XML) && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedGuide.dte.PDF && (
                                            <Button asChild variant="outline">
                                                <a href={selectedGuide.dte.PDF} target="_blank" rel="noreferrer">
                                                    <Download />
                                                    PDF
                                                </a>
                                            </Button>
                                        )}
                                        {selectedGuide.dte.XML && (
                                            <Button asChild variant="outline">
                                                <a href={selectedGuide.dte.XML} target="_blank" rel="noreferrer">
                                                    <Download />
                                                    XML
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )

}
