"use client"
import { useEffect, useMemo, useState } from "react"
import { ScanInput } from "@/components/CreateSale/ScanInput"
import { CartTable } from "@/components/CreateSale/CartTable"
import { useSaleStore } from "@/stores/sale.store"
import { CASH_SESSION_CHANGED_EVENT } from "@/lib/cash-session-events"
import { ISaleReceiver, ISaleRequest, PaymentType, SaleType } from "@/interfaces/sales/ISale"
import { useRouter, useSearchParams } from "next/navigation"
import { IProduct } from "@/interfaces/products/IProduct"
import { toPrice } from "@/utils/priceFormat"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { RutInput } from "../ui/rut-input"
import { useTienda } from "@/stores/tienda.store"
import { createNewSale } from "@/actions/sales/postSale"
import { getPaymentMethods } from "@/actions/cash-registers/cashCatalogs"
import { getActiveCashSession, getCashRegisters } from "@/actions/cash-registers/cashRegisters"
import { toast } from "sonner"
import { DiscountModal, DiscountStoreProductOption } from "@/components/Discounts/DiscountModal"
import { getPriceCheck } from "@/actions/pricing/getPriceCheck"
import { getChileYYYYMMDD } from "@/utils/chile-date"
import { normalizeRutValue } from "@/utils/rut"
import { Banknote, Building2, CreditCard, FileText, Receipt, UserPlus, WalletCards, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { IPaymentMethod, PaymentMethodType } from "@/interfaces/cash-registers/ICashCatalogs"
import type { ICashRegister, ICashSession } from "@/interfaces/cash-registers/ICashRegister"

const DEFAULT_RECEIVER_EMAIL = "soporte@araucopro.com"
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const isSpecialStoreFilter = (value: string | null) => value === "all" || value === "propias" || value === "consignadas"
const saleTypes = new Set<SaleType>(["BOLETA", "FACTURA", "NOTA_VENTA"])
const saleTypeOptions: Array<{
    value: SaleType
    label: string
    description: string
    icon: typeof Receipt
    selectedClassName: string
}> = [
    {
        value: "BOLETA",
        label: "Boleta electrónica",
        description: "Venta directa",
        icon: Receipt,
        selectedClassName:
            "border-blue-500 bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200",
    },
    {
        value: "NOTA_VENTA",
        label: "Nota de venta",
        description: "Sin DTE inmediato",
        icon: FileText,
        selectedClassName:
            "border-amber-500 bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200",
    },
    {
        value: "FACTURA",
        label: "Factura electrónica",
        description: "Con datos del receptor",
        icon: Building2,
        selectedClassName:
            "border-emerald-500 bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200",
    },
]
const legacyPaymentTypeByMethod: Partial<Record<PaymentMethodType, PaymentType>> = {
    CASH: "Efectivo",
    DEBIT_CARD: "Debito",
    CREDIT_CARD: "Credito",
}

const paymentVisuals: Record<PaymentType, { icon: typeof Banknote; selectedClassName: string }> = {
    Efectivo: {
        icon: Banknote,
        selectedClassName:
            "border-amber-500 bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200",
    },
    Debito: {
        icon: CreditCard,
        selectedClassName:
            "border-blue-500 bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200",
    },
    Credito: {
        icon: WalletCards,
        selectedClassName:
            "border-violet-500 bg-violet-50 text-violet-900 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-200",
    },
}

type OpenCashRegister = { register: ICashRegister; session: ICashSession }
const getSaleTypeFromParam = (value: string | null): SaleType =>
    value && saleTypes.has(value as SaleType) ? (value as SaleType) : "BOLETA"
const isValidEmail = (value: string) => {
    const email = value.trim()
    const [localPart, domain] = email.split("@")

    return Boolean(
        EMAIL_PATTERN.test(email) &&
        localPart &&
        domain &&
        !email.includes("..") &&
        !domain.startsWith("-") &&
        !domain.endsWith("-"),
    )
}

export const SaleForm = ({ initialProducts }: { initialProducts: IProduct[] }) => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { cartItems, actions } = useSaleStore()
    const { setPaymentMethod, clearCart, updateCartItemPricing } = actions
    const { storeSelected } = useTienda()
    const [loading, setLoading] = useState(false)
    const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false)
    const [saleType, setSaleType] = useState<SaleType>(() => getSaleTypeFromParam(searchParams.get("saleType")))
    const [showReceiverFields, setShowReceiverFields] = useState(() => saleType === "FACTURA")
    const [openCashRegisters, setOpenCashRegisters] = useState<OpenCashRegister[]>([])
    const [availablePaymentMethods, setAvailablePaymentMethods] = useState<IPaymentMethod[]>([])
    const [cashRegisterID, setCashRegisterID] = useState("")
    const [paymentMethodID, setPaymentMethodID] = useState("")
    const [cashSetupLoading, setCashSetupLoading] = useState(false)
    const [cashSetupError, setCashSetupError] = useState<string | null>(null)
    const [cashSetupRevision, setCashSetupRevision] = useState(0)
    const [receiver, setReceiver] = useState<ISaleReceiver>({
        rut: "",
        name: "",
        email: "",
        address: "",
        city: "",
        giro: "",
    })

    const urlStoreID = searchParams.get("storeID")
    const effectiveStoreID =
        storeSelected?.storeID ?? (urlStoreID && !isSpecialStoreFilter(urlStoreID) ? urlStoreID : "")
    const total = useMemo(() => {
        return cartItems.reduce((acc, item) => {
            const price = item.finalPrice ?? item.priceList
            return acc + item.quantity * price
        }, 0)
    }, [cartItems])

    useEffect(() => {
        const refreshCashSetup = () => setCashSetupRevision((value) => value + 1)
        window.addEventListener(CASH_SESSION_CHANGED_EVENT, refreshCashSetup)
        return () => window.removeEventListener(CASH_SESSION_CHANGED_EVENT, refreshCashSetup)
    }, [])

    useEffect(() => {
        if (!effectiveStoreID) {
            setOpenCashRegisters([])
            setAvailablePaymentMethods([])
            setCashRegisterID("")
            setPaymentMethodID("")
            return
        }

        let cancelled = false
        setCashSetupLoading(true)
        setCashSetupError(null)
        void Promise.all([
            getCashRegisters({ storeID: effectiveStoreID, status: "ACTIVE" }),
            getPaymentMethods({ active: true }),
        ])
            .then(async ([registers, methods]) => {
                const sessionResults = await Promise.allSettled(
                    registers.map(async (register) => ({
                        register,
                        session: await getActiveCashSession(register.cashRegisterID),
                    })),
                )
                if (cancelled) return

                const nextOpenRegisters = sessionResults.flatMap((result) =>
                    result.status === "fulfilled" && result.value.session
                        ? [{ register: result.value.register, session: result.value.session }]
                        : [],
                )
                const compatibleMethods = methods.filter((method) => Boolean(legacyPaymentTypeByMethod[method.type]))
                const preferredMethod =
                    compatibleMethods.find((method) => method.type === "CASH") ?? compatibleMethods[0]

                setOpenCashRegisters(nextOpenRegisters)
                setAvailablePaymentMethods(methods)
                setCashRegisterID((current) =>
                    nextOpenRegisters.some(({ register }) => register.cashRegisterID === current)
                        ? current
                        : (nextOpenRegisters[0]?.register.cashRegisterID ?? ""),
                )
                setPaymentMethodID((current) =>
                    compatibleMethods.some((method) => method.paymentMethodID === current)
                        ? current
                        : (preferredMethod?.paymentMethodID ?? ""),
                )
                if (preferredMethod) setPaymentMethod(legacyPaymentTypeByMethod[preferredMethod.type]!)
            })
            .catch((error) => {
                if (!cancelled) {
                    setCashSetupError(
                        error instanceof Error ? error.message : "No se pudo cargar la configuración de caja",
                    )
                }
            })
            .finally(() => {
                if (!cancelled) setCashSetupLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [cashSetupRevision, effectiveStoreID, setPaymentMethod])

    const selectPaymentMethod = (method: IPaymentMethod) => {
        const legacyType = legacyPaymentTypeByMethod[method.type]
        if (!legacyType) return
        setPaymentMethodID(method.paymentMethodID)
        setPaymentMethod(legacyType)
    }

    const selectedPaymentMethod = availablePaymentMethods.find((method) => method.paymentMethodID === paymentMethodID)
    const selectedLegacyPaymentType = selectedPaymentMethod
        ? legacyPaymentTypeByMethod[selectedPaymentMethod.type]
        : undefined

    const discountableStoreProducts = useMemo<DiscountStoreProductOption[]>(() => {
        const seen = new Set<string>()
        return cartItems
            .filter((item) => Boolean(item.storeProductID))
            .filter((item) => {
                if (seen.has(item.storeProductID)) return false
                seen.add(item.storeProductID)
                return true
            })
            .map((item) => ({
                storeProductID: item.storeProductID,
                productName: item.productName,
                variationName: item.sizeNumber,
                storeName: item.storeName ?? item.storeID,
                storeID: item.storeID,
                priceList: item.priceList,
            }))
    }, [cartItems])

    const hasDiscountableProducts = discountableStoreProducts.length > 0
    const handleDiscountCreated = async (storeProductID: string) => {
        try {
            const priceCheck = await getPriceCheck(storeProductID)
            updateCartItemPricing(storeProductID, {
                finalPrice: priceCheck.finalPrice,
                activeOffer: priceCheck.activeOffer ?? undefined,
            })
        } catch (error) {
            console.error("SaleForm: error refreshing pricing", error)
            toast.error("No se pudo actualizar el precio del producto")
        }
    }

    const handleSubmit = async () => {
        try {
            const receiverEmail = receiver.email?.trim() ?? ""
            const hasReceiverData = Boolean(
                receiver.rut.trim() ||
                receiver.name.trim() ||
                receiverEmail ||
                receiver.address.trim() ||
                receiver.city.trim() ||
                receiver.giro.trim(),
            )
            const shouldValidateReceiverEmail =
                saleType === "FACTURA" || (saleType === "NOTA_VENTA" && showReceiverFields && hasReceiverData)
            const hasEmptyProducts = cartItems.filter((item) => item.quantity === 0)
            if (hasEmptyProducts.length > 0) {
                return toast.error("Por favor elimina los productos sin stock")
            }
            if (!effectiveStoreID) return toast.error("No hay una tienda elegida")
            if (cashSetupLoading) return toast.error("Espera mientras se carga la configuración de caja")
            if (cashSetupError) return toast.error(cashSetupError)
            if (!cashRegisterID) return toast.error("Debes abrir un turno de caja antes de registrar la venta")
            if (!selectedPaymentMethod || !selectedLegacyPaymentType) {
                return toast.error("Selecciona un medio de pago activo")
            }
            if (saleType === "FACTURA" && (!receiver.rut.trim() || !receiver.name.trim())) {
                return toast.error("Para emitir una factura indica al menos el RUT y la razón social")
            }
            if (shouldValidateReceiverEmail && !receiverEmail) {
                return toast.error("Ingresa un correo del receptor o usa el correo por defecto.")
            }
            if (shouldValidateReceiverEmail && !isValidEmail(receiverEmail)) {
                return toast.error("Ingresa un correo válido para el receptor.")
            }

            const storeIDsInCart = new Set(cartItems.map((item) => item.storeID).filter(Boolean))
            if (storeIDsInCart.size > 1) {
                return toast.error("El carrito contiene productos de distintas tiendas.")
            }
            if (storeIDsInCart.size === 1 && !storeIDsInCart.has(effectiveStoreID)) {
                return toast.error("La tienda seleccionada no coincide con los productos del carrito.")
            }

            setLoading(true)
            const currentIssueDate = getChileYYYYMMDD(new Date())
            const shouldSendReceiver =
                saleType === "FACTURA" ||
                (saleType === "NOTA_VENTA" &&
                    showReceiverFields &&
                    Boolean(receiver.rut.trim() && receiver.name.trim() && receiverEmail))
            const toSubmitSale: ISaleRequest = {
                saleType,
                paymentType: selectedLegacyPaymentType,
                issueDate: currentIssueDate,
                cashRegisterID,
                payments: [{ paymentMethodID: selectedPaymentMethod.paymentMethodID, amount: total }],
                ...(shouldSendReceiver
                    ? {
                          receiver: {
                              rut: normalizeRutValue(receiver.rut),
                              name: receiver.name.trim(),
                              email: receiverEmail,
                              address: receiver.address.trim(),
                              city: receiver.city.trim(),
                              giro: receiver.giro.trim(),
                          },
                      }
                    : {}),
                items: cartItems.map((item) => ({
                    storeProductID: item.storeProductID,
                    quantity: item.quantity,
                })),
            }

            const res = await createNewSale(effectiveStoreID, toSubmitSale)
            if (res) {
                const createdSaleID = res.sale.saleID || res.dte?.saleID || ""
                toast.success(res.dte ? "Documento emitido exitosamente" : "Nota de venta creada exitosamente")
                actions.clearCart()
                router.refresh()
                router.push(
                    createdSaleID
                        ? `/home/${createdSaleID}?storeID=${effectiveStoreID}`
                        : `/home?storeID=${effectiveStoreID}`,
                )
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Falló al crear la venta :("
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        return () => {
            clearCart()
        }
    }, [clearCart])

    useEffect(() => {
        setSaleType(getSaleTypeFromParam(searchParams.get("saleType")))
    }, [searchParams])

    useEffect(() => {
        if (saleType === "FACTURA") {
            setShowReceiverFields(true)
            return
        }

        setShowReceiverFields(false)
    }, [saleType])

    return (
        <>
            <div className="p-4">
                <ScanInput initialProducts={initialProducts} />

                <CartTable />
                <div className="mt-4 flex flex-col gap-6">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                        <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                    Configura el documento
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    Selecciona una opción en cada grupo para continuar con la venta.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-auto"
                                    onClick={() => setIsDiscountModalOpen(true)}
                                    disabled={!hasDiscountableProducts}
                                    title={
                                        hasDiscountableProducts
                                            ? "Crear descuento"
                                            : "Agrega un producto con stock asignado para habilitar descuentos"
                                    }
                                >
                                    Crear descuento
                                </Button>
                                <div
                                    className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100 sm:justify-end"
                                    aria-live="polite"
                                >
                                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                                        Total estimado
                                    </span>
                                    <span className="text-lg font-black">${toPrice(total)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative grid gap-4 xl:grid-cols-2 xl:gap-8">
                            <div
                                aria-hidden="true"
                                className="absolute inset-y-0 left-1/2 hidden -translate-x-1/2 items-center xl:flex"
                            >
                                <span className="h-full w-px bg-slate-300 dark:bg-slate-600" />
                                <span className="absolute left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-500 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                    Y
                                </span>
                            </div>

                            <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/30 p-3 dark:border-blue-950 dark:bg-blue-950/10">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                                        1
                                    </span>
                                    <div>
                                        <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                            Documento
                                        </label>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            ¿Qué documento deseas emitir?
                                        </p>
                                    </div>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Tipo de documento">
                                    {saleTypeOptions.map((option) => {
                                        const Icon = option.icon
                                        const selected = saleType === option.value

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                aria-pressed={selected}
                                                onClick={() => setSaleType(option.value)}
                                                className={`flex min-h-20 items-center gap-3 rounded-lg border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                                    selected
                                                        ? `${option.selectedClassName} ring-1`
                                                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                                }`}
                                            >
                                                <span
                                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                                                        selected
                                                            ? "bg-white/70 dark:bg-slate-900/50"
                                                            : "bg-slate-100 dark:bg-slate-800"
                                                    }`}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-semibold leading-tight">
                                                        {option.label}
                                                    </span>
                                                    <span className="mt-1 block text-xs opacity-70">
                                                        {option.description}
                                                    </span>
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 xl:hidden" aria-hidden="true">
                                <span className="h-px flex-1 bg-slate-300 dark:bg-slate-600" />
                                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                    Y
                                </span>
                                <span className="h-px flex-1 bg-slate-300 dark:bg-slate-600" />
                            </div>

                            <div className="space-y-3 rounded-lg border border-amber-100 bg-amber-50/30 p-3 dark:border-amber-950 dark:bg-amber-950/10">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                                        2
                                    </span>
                                    <div>
                                        <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                            Caja y medio de pago
                                        </label>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            La venta quedará registrada en el turno seleccionado.
                                        </p>
                                    </div>
                                </div>

                                {cashSetupLoading ? (
                                    <p className="rounded-lg border border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-500">
                                        Cargando cajas y medios de pago...
                                    </p>
                                ) : cashSetupError ? (
                                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                                        {cashSetupError}
                                    </p>
                                ) : !openCashRegisters.length ? (
                                    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                                        <p className="font-semibold">No hay una caja con turno abierto.</p>
                                        <p className="mt-1 text-xs">
                                            Abre un turno antes de registrar ventas en esta tienda.
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="bg-white"
                                                onClick={() =>
                                                    window.open(
                                                        `/home/cajas?storeID=${effectiveStoreID}`,
                                                        "_blank",
                                                        "noopener,noreferrer",
                                                    )
                                                }
                                            >
                                                Abrir Cajas
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="bg-white"
                                                onClick={() => setCashSetupRevision((value) => value + 1)}
                                            >
                                                Actualizar
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                Caja con turno abierto
                                            </label>
                                            <Select value={cashRegisterID} onValueChange={setCashRegisterID}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona una caja" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {openCashRegisters.map(({ register, session }) => (
                                                        <SelectItem
                                                            key={register.cashRegisterID}
                                                            value={register.cashRegisterID}
                                                        >
                                                            {register.name} · {register.code} · {session.businessDate}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {availablePaymentMethods.length ? (
                                            <div
                                                className="grid grid-cols-2 gap-2 md:grid-cols-4"
                                                role="group"
                                                aria-label="Medio de pago"
                                            >
                                                {availablePaymentMethods.map((method) => {
                                                    const legacyType = legacyPaymentTypeByMethod[method.type]
                                                    const visual = legacyType ? paymentVisuals[legacyType] : null
                                                    const Icon = visual?.icon ?? CreditCard
                                                    const selected = paymentMethodID === method.paymentMethodID
                                                    return (
                                                        <button
                                                            key={method.paymentMethodID}
                                                            type="button"
                                                            aria-pressed={selected}
                                                            disabled={!legacyType}
                                                            onClick={() => selectPaymentMethod(method)}
                                                            className={`flex min-h-20 items-center gap-3 rounded-lg border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${selected && visual ? `${visual.selectedClassName} ring-1` : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"}`}
                                                        >
                                                            <span
                                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${selected ? "bg-white/70 dark:bg-slate-900/50" : "bg-slate-100 dark:bg-slate-800"}`}
                                                            >
                                                                <Icon className="h-4 w-4" />
                                                            </span>
                                                            <span className="min-w-0">
                                                                <span className="block text-sm font-semibold leading-tight">
                                                                    {method.name}
                                                                </span>
                                                                <span className="mt-1 block text-xs opacity-70">
                                                                    {!legacyType
                                                                        ? "En desarrollo"
                                                                        : legacyType === "Efectivo"
                                                                          ? "Efectivo"
                                                                          : legacyType === "Debito"
                                                                            ? "Tarjeta de débito"
                                                                            : "Tarjeta de crédito"}
                                                                </span>
                                                            </span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                                                No hay medios de pago activos compatibles con ventas. Configúralos en la
                                                sección Cajas.
                                            </p>
                                        )}
                                        {availablePaymentMethods.some(
                                            (method) => legacyPaymentTypeByMethod[method.type],
                                        ) && (
                                            <p className="text-xs text-slate-500">
                                                Pago dividido entre varios medios:{" "}
                                                <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                                                    En desarrollo
                                                </span>
                                            </p>
                                        )}
                                        {availablePaymentMethods.length > 0 &&
                                            !availablePaymentMethods.some(
                                                (method) => legacyPaymentTypeByMethod[method.type],
                                            ) && (
                                                <p className="text-xs text-amber-800">
                                                    El contrato de ventas todavía no permite usar estos tipos de pago.
                                                </p>
                                            )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {saleType === "NOTA_VENTA" && !showReceiverFields && (
                        <div className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50/40 p-4 dark:border-emerald-900 dark:bg-emerald-950/10">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-800 dark:text-slate-100">
                                        Datos del receptor ocultos
                                    </h3>
                                    <p className="text-xs text-gray-600 dark:text-slate-400">
                                        Puedes agregarlos si esta nota podría convertirse después en factura.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowReceiverFields(true)}
                                    className="h-auto min-h-10 whitespace-normal border-emerald-300 py-2 text-left text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950 sm:text-center"
                                >
                                    <UserPlus />
                                    Agregar datos para futura factura
                                </Button>
                            </div>
                        </div>
                    )}

                    {saleType !== "BOLETA" && showReceiverFields && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-800 dark:text-slate-100">
                                        Datos del receptor
                                    </h3>
                                    {saleType === "NOTA_VENTA" && (
                                        <p className="text-xs text-gray-600 dark:text-slate-400">
                                            Opcional para notas. Si los guardas, el correo es obligatorio.
                                        </p>
                                    )}
                                </div>
                                {saleType === "NOTA_VENTA" && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowReceiverFields(false)}
                                        className="justify-start border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:justify-center"
                                    >
                                        <X />
                                        Ocultar datos
                                    </Button>
                                )}
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <RutInput
                                    value={receiver.rut}
                                    onValueChange={(rut) => setReceiver((current) => ({ ...current, rut }))}
                                    placeholder="RUT"
                                />
                                <Input
                                    value={receiver.name}
                                    onChange={(event) =>
                                        setReceiver((current) => ({ ...current, name: event.target.value }))
                                    }
                                    placeholder="Razón social"
                                />
                                <div className="space-y-2">
                                    <Input
                                        type="email"
                                        value={receiver.email}
                                        onChange={(event) =>
                                            setReceiver((current) => ({ ...current, email: event.target.value }))
                                        }
                                        placeholder="Correo del receptor"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setReceiver((current) => ({ ...current, email: DEFAULT_RECEIVER_EMAIL }))
                                        }
                                        className="h-auto whitespace-normal border-blue-300 bg-blue-50 px-3 py-1.5 text-left text-xs font-medium text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950"
                                    >
                                        Cliente sin correo: usar {DEFAULT_RECEIVER_EMAIL}
                                    </Button>
                                </div>
                                <Input
                                    value={receiver.giro}
                                    onChange={(event) =>
                                        setReceiver((current) => ({ ...current, giro: event.target.value }))
                                    }
                                    placeholder="Giro"
                                />
                                <Input
                                    value={receiver.address}
                                    onChange={(event) =>
                                        setReceiver((current) => ({ ...current, address: event.target.value }))
                                    }
                                    placeholder="Dirección"
                                />
                                <Input
                                    value={receiver.city}
                                    onChange={(event) =>
                                        setReceiver((current) => ({ ...current, city: event.target.value }))
                                    }
                                    placeholder="Comuna o ciudad"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col items-end justify-between gap-4 md:flex-row md:items-center">
                        <div></div>
                        <Button
                            disabled={
                                loading ||
                                cashSetupLoading ||
                                cartItems.length === 0 ||
                                !cashRegisterID ||
                                !paymentMethodID
                            }
                            onClick={handleSubmit}
                            className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition"
                        >
                            {loading ? "Procesando..." : saleType === "NOTA_VENTA" ? "Crear nota" : "Emitir documento"}
                        </Button>
                    </div>
                </div>
            </div>
            <DiscountModal
                isOpen={isDiscountModalOpen}
                onClose={() => setIsDiscountModalOpen(false)}
                options={discountableStoreProducts}
                initialStoreProductID={discountableStoreProducts[0]?.storeProductID}
                onOfferCreated={(storeProductID) => handleDiscountCreated(storeProductID)}
            />
        </>
    )
}
