"use client"

import { FormEvent, ReactNode, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    assignCashSessionOperator,
    closeCashSession,
    completeCashClosing,
    completeCashCount,
    createCashMovement,
    getCashSessions,
    getCashSessionSummary,
    getCashSessionOperators,
    getCashMovements,
    getCurrentCashClosing,
    getCurrentCashCount,
    openCashSession,
    startCashClosing,
    startCashCount,
    updateCashCountItems,
} from "@/actions/cash-registers/cashRegisters"
import { getCashDenominations, getCashMovementReasons } from "@/actions/cash-registers/cashCatalogs"
import { getStoreUsers } from "@/actions/stores/getStoreUsers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type {
    CashMovementType,
    ICashDenomination,
    ICashMovementReason,
} from "@/interfaces/cash-registers/ICashCatalogs"
import type {
    ICashMovement,
    ICashRegister,
    ICashSession,
    ICashSessionSummary,
} from "@/interfaces/cash-registers/ICashRegister"
import type { IUser } from "@/interfaces/users/IUser"
import { Role } from "@/lib/userRoles"
import { useAuth } from "@/stores/user.store"
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, Banknote, Calculator, ChevronDown, History, UserRound } from "lucide-react"
import { toast } from "sonner"

const toCLP = (value: number | null | undefined) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value ?? 0)

const toLocalDate = () => {
    const date = new Date()
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

const formatDateTime = (value?: string | null) => {
    if (!value) return "—"
    const date = new Date(value)
    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(date)
}

const formatTime = (value?: string | null) => {
    if (!value) return "—"
    const date = new Date(value)
    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit" }).format(date)
}

const getClosingUserName = (
    userID: string | null,
    storeUsers: IUser[],
    currentUser: IUser | null,
    summary: ICashSessionSummary | null,
) => {
    if (!userID) return "Sin cierre registrado"
    const user = storeUsers.find((item) => item.userID === userID)
        ?? summary?.operators.find((operator) => operator.userID === userID)?.user
        ?? (currentUser?.userID === userID ? currentUser : null)
    return user?.name || `Usuario ${userID}`
}

type CashSessionDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    register: ICashRegister | null
    activeSession: ICashSession | null
    onChanged: () => Promise<void> | void
}

export default function CashSessionDialog({
    open,
    onOpenChange,
    register,
    activeSession,
    onChanged,
}: CashSessionDialogProps) {
    const router = useRouter()
    const currentUser = useAuth((state) => state.user)
    const [view, setView] = useState<"main" | "movement" | "count">("main")
    const [businessDate, setBusinessDate] = useState(toLocalDate)
    const [currentTime, setCurrentTime] = useState("")
    const [selectedSellerID, setSelectedSellerID] = useState("")
    const [availableSellers, setAvailableSellers] = useState<IUser[]>([])
    const [openingBalance, setOpeningBalance] = useState("")
    const [openingNotes, setOpeningNotes] = useState("")
    const [countedCashBalance, setCountedCashBalance] = useState("")
    const [closingNotes, setClosingNotes] = useState("")
    const [summary, setSummary] = useState<ICashSessionSummary | null>(null)
    const [storeUsers, setStoreUsers] = useState<IUser[]>([])
    const [history, setHistory] = useState<ICashSession[]>([])
    const [historySummary, setHistorySummary] = useState<ICashSessionSummary | null>(null)
    const [historySummarySessionID, setHistorySummarySessionID] = useState<string | null>(null)
    const [isLoadingHistorySummary, setIsLoadingHistorySummary] = useState(false)
    const [showCashInDetails, setShowCashInDetails] = useState(false)
    const [cashInMovements, setCashInMovements] = useState<ICashMovement[] | null>(null)
    const [isLoadingCashInDetails, setIsLoadingCashInDetails] = useState(false)
    const [isLoadingDetail, setIsLoadingDetail] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [movementType, setMovementType] = useState<CashMovementType>("CASH_OUT")
    const [movementAmount, setMovementAmount] = useState("")
    const [movementReason, setMovementReason] = useState("")
    const [movementDescription, setMovementDescription] = useState("")
    const [reasons, setReasons] = useState<ICashMovementReason[]>([])
    const [denominations, setDenominations] = useState<ICashDenomination[]>([])
    const [quantities, setQuantities] = useState<Record<string, string>>({})
    const [countNotes, setCountNotes] = useState("")

    useEffect(() => {
        if (!open) return

        let timeoutID: ReturnType<typeof setTimeout>
        const refreshTime = () => {
            const now = new Date()
            setCurrentTime(formatTime(now.toISOString()))
            timeoutID = setTimeout(refreshTime, 60_000 - now.getSeconds() * 1000 - now.getMilliseconds())
        }

        refreshTime()
        return () => clearTimeout(timeoutID)
    }, [open])

    useEffect(() => {
        if (!open || !register) return
        setBusinessDate(toLocalDate())
        setSelectedSellerID("")
        setAvailableSellers([])
        setOpeningBalance("")
        setOpeningNotes("")
        setCountedCashBalance("")
        setClosingNotes("")
        setView("main")
        setMovementType("CASH_OUT")
        setMovementAmount("")
        setMovementReason("")
        setMovementDescription("")
        setReasons([])
        setDenominations([])
        setQuantities({})
        setCountNotes("")
        setSummary(null)
        setStoreUsers([])
        setHistory([])
        setHistorySummary(null)
        setHistorySummarySessionID(null)
        setShowCashInDetails(false)
        setCashInMovements(null)

        let cancelled = false
        setIsLoadingDetail(true)
        const requests: Promise<unknown>[] = [
            getCashSessions(register.cashRegisterID).then((sessions) => {
                if (!cancelled) setHistory(sessions)
            }),
            getStoreUsers(register.storeID).then((users) => {
                if (cancelled) return
                const activeUsers = users.filter((user) => !user.status || user.status === "ACTIVE")
                const sellers = activeUsers
                    .filter((user) => user.role === Role.Vendedor)
                    .sort((a, b) => a.name.localeCompare(b.name, "es"))
                setStoreUsers(users)
                setAvailableSellers(sellers)
                setSelectedSellerID((current) =>
                    sellers.some((seller) => seller.userID === current) ? current : (sellers[0]?.userID ?? ""),
                )
            }),
        ]
        if (activeSession) {
            requests.push(
                getCashSessionSummary(register.cashRegisterID, activeSession.sessionID).then((response) => {
                    if (!cancelled) setSummary(response)
                }),
            )
        }
        void Promise.allSettled(requests).finally(() => {
            if (!cancelled) setIsLoadingDetail(false)
        })

        return () => {
            cancelled = true
        }
    }, [activeSession, open, register])

    const refreshSummary = async () => {
        if (!register || !activeSession) return
        const response = await getCashSessionSummary(register.cashRegisterID, activeSession.sessionID)
        setSummary(response)
    }

    const openMovementView = async () => {
        setIsLoadingDetail(true)
        try {
            const response = await getCashMovementReasons({ active: true })
            setReasons(response)
            setMovementReason("")
            setView("movement")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudieron cargar las razones")
        } finally {
            setIsLoadingDetail(false)
        }
    }

    const openCountView = async () => {
        if (!register || !activeSession) return
        setIsLoadingDetail(true)
        try {
            const [catalog, currentCount] = await Promise.all([
                getCashDenominations({ active: true }),
                getCurrentCashCount(register.cashRegisterID, activeSession.sessionID),
            ])
            if (!catalog.length) {
                toast.error("Primero carga las denominaciones desde Catálogos de caja")
                return
            }
            const currentQuantities = Object.fromEntries(
                (currentCount?.items ?? []).map((item) => [item.denominationID, String(item.quantity)]),
            )
            setDenominations(catalog)
            setQuantities(currentQuantities)
            setCountNotes(currentCount?.notes ?? "")
            setView("count")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudieron cargar las denominaciones")
        } finally {
            setIsLoadingDetail(false)
        }
    }

    const handleMovement = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!register || !activeSession) return
        const amount = Number(movementAmount)
        if (!movementReason || !Number.isFinite(amount) || amount <= 0) {
            toast.error("Selecciona una razón e ingresa un monto válido")
            return
        }
        setIsSubmitting(true)
        try {
            await createCashMovement(register.cashRegisterID, activeSession.sessionID, {
                type: movementType,
                amount,
                reason: movementReason,
                ...(movementDescription.trim() ? { description: movementDescription.trim() } : {}),
            })
            toast.success(movementType === "CASH_IN" ? "Entrada registrada" : "Salida registrada")
            setMovementAmount("")
            setMovementDescription("")
            setCashInMovements(null)
            setShowCashInDetails(false)
            await refreshSummary()
            await onChanged()
            setView("main")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo registrar el movimiento")
        } finally {
            setIsSubmitting(false)
        }
    }

    const countTotal = denominations.reduce((total, denomination) => {
        const quantity = Number(quantities[denomination.cashDenominationID] ?? 0)
        return total + denomination.value * (Number.isFinite(quantity) ? quantity : 0)
    }, 0)

    const handleDetailedCount = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!register || !activeSession) return
        const items = denominations
            .map((denomination) => ({
                denominationID: denomination.cashDenominationID,
                quantity: Number(quantities[denomination.cashDenominationID] ?? 0),
            }))
            .filter((item) => Number.isInteger(item.quantity) && item.quantity > 0)
        if (!items.length) {
            toast.error("Ingresa al menos una cantidad para completar el conteo")
            return
        }
        setIsSubmitting(true)
        try {
            const { cashRegisterID } = register
            const { sessionID } = activeSession
            const closing = await getCurrentCashClosing(cashRegisterID, sessionID)
            if (!closing) await startCashClosing(cashRegisterID, sessionID, countNotes.trim() || undefined)
            const count = await getCurrentCashCount(cashRegisterID, sessionID)
            if (!count) await startCashCount(cashRegisterID, sessionID, countNotes.trim() || undefined)
            else if (count.status !== "DRAFT") throw new Error("El conteo actual ya fue completado o cancelado")
            await updateCashCountItems(cashRegisterID, sessionID, items)
            await completeCashCount(cashRegisterID, sessionID, countNotes.trim() || undefined)
            await completeCashClosing(cashRegisterID, sessionID, countNotes.trim() || undefined)
            toast.success(`Turno cerrado con un conteo de ${toCLP(countTotal)}`)
            await onChanged()
            onOpenChange(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo completar el arqueo")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleOpen = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!register) return
        const balance = Number(openingBalance)
        if (!Number.isFinite(balance) || balance < 0) {
            toast.error("Ingresa un monto de caja inicial válido")
            return
        }
        if (!selectedSellerID) {
            toast.error("Selecciona el vendedor que atenderá la caja")
            return
        }
        let openedSession: ICashSession | null = null
        setIsSubmitting(true)
        try {
            openedSession = await openCashSession(register.cashRegisterID, {
                businessDate,
                openingBalance: balance,
                ...(openingNotes.trim() ? { openingNotes: openingNotes.trim() } : {}),
            })
            const assignedOperators = await getCashSessionOperators(register.cashRegisterID, openedSession.sessionID, {
                active: true,
            })
            if (!assignedOperators.some((operator) => operator.userID === selectedSellerID)) {
                await assignCashSessionOperator(register.cashRegisterID, openedSession.sessionID, {
                    userID: selectedSellerID,
                    role: "OPERATOR",
                })
            }
            const seller = availableSellers.find((user) => user.userID === selectedSellerID)
            toast.success(`Turno abierto para ${seller?.name ?? "el vendedor seleccionado"}`)
            await onChanged()
            onOpenChange(false)
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudo abrir el turno"
            if (openedSession) {
                toast.error(`La caja se abrió, pero no se pudo asignar el vendedor: ${message}`)
                await onChanged()
                onOpenChange(false)
            } else {
                toast.error(message)
                await onChanged()
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleHistorySummary = async (session: ICashSession) => {
        if (!register) return
        if (historySummarySessionID === session.sessionID) {
            setHistorySummarySessionID(null)
            setHistorySummary(null)
            return
        }

        setHistorySummarySessionID(session.sessionID)
        setHistorySummary(null)
        setIsLoadingHistorySummary(true)
        try {
            const response = await getCashSessionSummary(register.cashRegisterID, session.sessionID)
            setHistorySummary(response)
        } catch (error) {
            setHistorySummarySessionID(null)
            toast.error(error instanceof Error ? error.message : "No se pudo cargar el resumen de la sesión")
        } finally {
            setIsLoadingHistorySummary(false)
        }
    }

    const toggleCashInDetails = async () => {
        if (!register || !activeSession) return
        if (showCashInDetails) {
            setShowCashInDetails(false)
            return
        }

        setShowCashInDetails(true)
        if (cashInMovements) return

        setIsLoadingCashInDetails(true)
        try {
            const movements = await getCashMovements(register.cashRegisterID, activeSession.sessionID, {
                type: "CASH_IN",
                status: "POSTED",
            })
            setCashInMovements(movements)
        } catch (error) {
            setShowCashInDetails(false)
            toast.error(error instanceof Error ? error.message : "No se pudo cargar el detalle de entradas")
        } finally {
            setIsLoadingCashInDetails(false)
        }
    }

    const handleClose = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!register || !activeSession) return
        const counted = Number(countedCashBalance)
        if (!Number.isFinite(counted) || counted < 0 || countedCashBalance.trim() === "") {
            toast.error("Ingresa el efectivo contado")
            return
        }
        setIsSubmitting(true)
        try {
            await closeCashSession(register.cashRegisterID, {
                countedCashBalance: counted,
                ...(closingNotes.trim() ? { closingNotes: closingNotes.trim() } : {}),
            })
            toast.success("Turno cerrado correctamente")
            await onChanged()
            onOpenChange(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo cerrar el turno")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!register) return null

    const applicableReasons = reasons.filter((reason) => !reason.type || reason.type === movementType)
    const openingCash = summary?.expected.openingBalance ?? activeSession?.openingBalance ?? 0
    const cashIn = summary?.cashMovements.cashIn ?? 0
    const cashOut = summary?.cashMovements.cashOut ?? 0
    const cashSubtotal = openingCash + cashIn
    const expectedCash = summary?.expected.expectedCashAmount ?? activeSession?.expectedCashBalance ?? openingCash
    const paymentMethodsForDisplay = summary?.payments.byMethod ?? []
    const activeOperators = summary?.operators.filter((operator) => !operator.leftAt) ?? []
    const saleCashIn =
        cashInMovements
            ?.filter((movement) => movement.referenceType === "SALE")
            .reduce((total, movement) => total + movement.amount, 0) ?? 0
    const manualCashIn =
        cashInMovements
            ?.filter(
                (movement) =>
                    movement.referenceType === "MANUAL" || movement.referenceType === "CASH_MOVEMENT",
            )
            .reduce((total, movement) => total + movement.amount, 0) ?? 0
    const otherCashIn =
        cashInMovements
            ?.filter(
                (movement) =>
                    movement.referenceType !== "SALE" &&
                    movement.referenceType !== "MANUAL" &&
                    movement.referenceType !== "CASH_MOVEMENT",
            )
            .reduce((total, movement) => total + movement.amount, 0) ?? 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
                    <DialogTitle>{register.name}</DialogTitle>
                    <DialogDescription>
                        {register.code} · {activeSession ? "Turno abierto" : "Sin turno activo"}
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                    {!activeSession ? (
                        <form id="cash-session-form" onSubmit={handleOpen} className="space-y-5">
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                Configura el turno y asigna al vendedor. La hora de entrada se registra automáticamente.
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="business-date" className="mb-2 block">
                                        Fecha contable
                                    </Label>
                                    <Input
                                        id="business-date"
                                        type="date"
                                        value={businessDate}
                                        disabled
                                        className="disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="opening-balance" className="mb-2 block">
                                        Monto de caja inicial
                                    </Label>
                                    <CurrencyInput
                                        id="opening-balance"
                                        value={openingBalance}
                                        onValueChange={setOpeningBalance}
                                        placeholder="$ 0"
                                        required
                                    />
                                    <p className="mt-1.5 text-xs text-slate-500">
                                        Indica cuánto efectivo hay en la caja al comenzar el turno.
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label className="mb-2 block">Vendedor asignado</Label>
                                    <Select value={selectedSellerID} onValueChange={setSelectedSellerID}>
                                        <SelectTrigger disabled={isLoadingDetail || availableSellers.length === 0}>
                                            <SelectValue
                                                placeholder={
                                                    isLoadingDetail ? "Cargando vendedores..." : "Selecciona un vendedor"
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableSellers.map((seller) => (
                                                <SelectItem key={seller.userID} value={seller.userID}>
                                                    {seller.name} · {seller.email}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {!isLoadingDetail && availableSellers.length === 0 ? (
                                        <div className="mt-1.5 space-y-2">
                                            <p className="text-xs text-amber-700">
                                                No hay vendedores activos asignados a esta tienda.
                                            </p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-auto whitespace-normal text-left"
                                                onClick={() => {
                                                    onOpenChange(false)
                                                    router.push(`/home/recursos-humanos?${new URLSearchParams({ storeID: register.storeID })}`)
                                                }}
                                            >
                                                Ir a dar de alta un vendedor
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                                <div>
                                    <Label htmlFor="operator-start-time" className="mb-2 block">
                                        Hora de entrada
                                    </Label>
                                    <Input
                                        id="operator-start-time"
                                        value={currentTime}
                                        disabled
                                        className="disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
                                    />
                                    <p className="mt-1.5 text-xs text-slate-500">
                                        La salida se registrará al cerrar el turno.
                                    </p>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="opening-notes" className="mb-2 block">
                                    Notas de apertura
                                </Label>
                                <Textarea
                                    id="opening-notes"
                                    value={openingNotes}
                                    onChange={(event) => setOpeningNotes(event.target.value)}
                                    placeholder="Observaciones opcionales"
                                />
                            </div>
                        </form>
                    ) : view === "movement" ? (
                        <form id="cash-movement-form" onSubmit={handleMovement} className="space-y-5">
                            <button
                                type="button"
                                onClick={() => setView("main")}
                                className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300"
                            >
                                <ArrowLeft className="h-4 w-4" /> Volver al turno
                            </button>
                            <div>
                                <h3 className="font-bold text-slate-950 dark:text-white">
                                    Movimiento manual de efectivo
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Registra una entrada o salida usando una razón activa del catálogo.
                                </p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label className="mb-2 block">Tipo</Label>
                                    <Select
                                        value={movementType}
                                        onValueChange={(value: CashMovementType) => {
                                            setMovementType(value)
                                            setMovementReason("")
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CASH_IN">Entrada de efectivo</SelectItem>
                                            <SelectItem value="CASH_OUT">Salida de efectivo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="movement-amount" className="mb-2 block">
                                        Monto
                                    </Label>
                                    <CurrencyInput
                                        id="movement-amount"
                                        value={movementAmount}
                                        onValueChange={setMovementAmount}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="mb-2 block">Razón</Label>
                                <Select value={movementReason} onValueChange={setMovementReason}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una razón" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {applicableReasons.map((reason) => (
                                            <SelectItem key={reason.cashMovementReasonID} value={reason.code}>
                                                {reason.name}
                                                {reason.requiresApproval ? " · Requiere supervisor" : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {!applicableReasons.length && (
                                    <p className="mt-2 text-xs text-amber-700">
                                        No hay razones activas para este movimiento. Configúralas en Catálogos de caja.
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="movement-description" className="mb-2 block">
                                    Descripción
                                </Label>
                                <Textarea
                                    id="movement-description"
                                    value={movementDescription}
                                    onChange={(event) => setMovementDescription(event.target.value)}
                                    placeholder="Justificación u observación opcional"
                                    maxLength={500}
                                />
                            </div>
                        </form>
                    ) : view === "count" ? (
                        <form id="cash-count-form" onSubmit={handleDetailedCount} className="space-y-5">
                            <button
                                type="button"
                                onClick={() => setView("main")}
                                className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300"
                            >
                                <ArrowLeft className="h-4 w-4" /> Volver al turno
                            </button>
                            <div className="flex flex-wrap items-end justify-between gap-3">
                                <div>
                                    <h3 className="font-bold text-slate-950 dark:text-white">
                                        Arqueo por denominaciones
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Cuenta billetes y monedas. Al completar, el turno quedará cerrado.
                                    </p>
                                </div>
                                <div className="rounded-lg bg-emerald-50 px-4 py-2 text-right">
                                    <p className="text-xs font-semibold text-emerald-700">Total contado</p>
                                    <p className="text-xl font-black text-emerald-900">{toCLP(countTotal)}</p>
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {denominations.map((denomination) => (
                                    <div
                                        key={denomination.cashDenominationID}
                                        className="grid grid-cols-[1fr_100px] items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
                                    >
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                {denomination.label || toCLP(denomination.value)}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {denomination.type === "BANKNOTE" ? "Billete" : "Moneda"}
                                            </p>
                                        </div>
                                        <Input
                                            aria-label={`Cantidad de ${denomination.label}`}
                                            type="number"
                                            min={0}
                                            step={1}
                                            value={quantities[denomination.cashDenominationID] ?? ""}
                                            onChange={(event) =>
                                                setQuantities((current) => ({
                                                    ...current,
                                                    [denomination.cashDenominationID]: event.target.value,
                                                }))
                                            }
                                            placeholder="0"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div>
                                <Label htmlFor="count-closing-time" className="mb-2 block">
                                    Hora de cierre
                                </Label>
                                <Input
                                    id="count-closing-time"
                                    value={currentTime}
                                    disabled
                                    className="disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
                                />
                            </div>
                            <div>
                                <Label htmlFor="count-notes" className="mb-2 block">
                                    Notas del arqueo
                                </Label>
                                <Textarea
                                    id="count-notes"
                                    value={countNotes}
                                    onChange={(event) => setCountNotes(event.target.value)}
                                    placeholder="Justifica cualquier diferencia"
                                    maxLength={500}
                                />
                            </div>
                        </form>
                    ) : (
                        <form id="cash-session-form" onSubmit={handleClose} className="space-y-6">
                            <section
                                aria-labelledby="cash-reconciliation-title"
                                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/50"
                            >
                                <div className="mb-4">
                                    <h3
                                        id="cash-reconciliation-title"
                                        className="text-sm font-bold text-slate-950 dark:text-white"
                                    >
                                        Conciliación de efectivo
                                    </h3>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Así se calcula el efectivo que debería haber físicamente en la caja.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                            1. Suma las entradas
                                        </p>
                                        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1.5 sm:gap-2">
                                            <CashFlowMetric
                                                label="Monto inicial"
                                                value={toCLP(openingCash)}
                                                icon={Banknote}
                                            />
                                            <FlowOperator symbol="+" />
                                            <CashFlowMetric
                                                label="Entradas"
                                                value={toCLP(cashIn)}
                                                icon={ArrowDownToLine}
                                                tone="positive"
                                                action={
                                                    <button
                                                        type="button"
                                                        onClick={() => void toggleCashInDetails()}
                                                        className="mt-2 text-left text-[10px] font-bold leading-tight text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300 sm:text-xs"
                                                        aria-expanded={showCashInDetails}
                                                    >
                                                        {showCashInDetails ? "Ocultar detalle" : "Ver detalle de entradas"}
                                                    </button>
                                                }
                                            />
                                            <FlowOperator symbol="=" />
                                            <CashFlowMetric
                                                label="Subtotal"
                                                value={toCLP(cashSubtotal)}
                                                icon={Calculator}
                                                tone="subtotal"
                                            />
                                        </div>
                                        {showCashInDetails ? (
                                            <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3 dark:border-emerald-900 dark:bg-slate-900">
                                                <div className="mb-2 flex items-center justify-between gap-3">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                                                        Detalle de entradas
                                                    </p>
                                                    <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                                                        {toCLP(cashIn)}
                                                    </span>
                                                </div>
                                                {isLoadingCashInDetails ? (
                                                    <p className="text-xs text-slate-500">Cargando movimientos...</p>
                                                ) : (
                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                        <CashInDetailRow
                                                            label="Ventas en efectivo"
                                                            value={toCLP(saleCashIn)}
                                                        />
                                                        <CashInDetailRow
                                                            label="Entradas manuales"
                                                            value={toCLP(manualCashIn)}
                                                        />
                                                        {otherCashIn > 0 ? (
                                                            <CashInDetailRow
                                                                label="Otros ingresos"
                                                                value={toCLP(otherCashIn)}
                                                            />
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}
                                        <p className="mt-1.5 text-[11px] text-slate-500">
                                            Las entradas incluyen ventas en efectivo y otros ingresos registrados.
                                        </p>
                                    </div>

                                    <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                            2. Resta los egresos
                                        </p>
                                        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1.5 sm:gap-2">
                                            <CashFlowMetric
                                                label="Subtotal"
                                                value={toCLP(cashSubtotal)}
                                                icon={Calculator}
                                                tone="subtotal"
                                            />
                                            <FlowOperator symbol="−" />
                                            <CashFlowMetric
                                                label="Egresos"
                                                value={toCLP(cashOut)}
                                                icon={ArrowUpFromLine}
                                                tone="negative"
                                            />
                                            <FlowOperator symbol="=" />
                                            <CashFlowMetric
                                                label="Total esperado"
                                                value={toCLP(expectedCash)}
                                                icon={Banknote}
                                                tone="total"
                                            />
                                        </div>
                                        <p className="mt-1.5 text-[11px] text-slate-500">
                                            Los egresos incluyen retiros y otras salidas de efectivo del turno.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-xs font-bold uppercase text-slate-500">Turno activo</p>
                                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                                            Abierto {formatDateTime(activeSession.openedAt)}
                                        </p>
                                    </div>
                                    <Badge className="bg-emerald-100 text-emerald-800">Abierto</Badge>
                                </div>
                                {activeOperators.length ? (
                                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                                        {activeOperators.map((operator) => (
                                            <div
                                                key={operator.sessionUserID}
                                                className="flex flex-wrap items-center justify-between gap-2 text-sm"
                                            >
                                                <span className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                                                    <UserRound className="h-4 w-4 text-emerald-700" />
                                                    {operator.user?.name ||
                                                        storeUsers.find((user) => user.userID === operator.userID)?.name ||
                                                        "Vendedor"}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    Entrada {formatTime(operator.enteredAt)} · En turno
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => void openMovementView()}
                                    disabled={isLoadingDetail}
                                >
                                    <ArrowDownToLine className="h-4 w-4" /> Movimiento manual
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => void openCountView()}
                                    disabled={isLoadingDetail}
                                >
                                    <Calculator className="h-4 w-4" /> Arqueo por denominaciones
                                </Button>
                            </div>

                            {paymentMethodsForDisplay.length ? (
                                <div>
                                    <p className="mb-3 text-xs font-bold uppercase text-slate-500">Cobros del turno</p>
                                    <div className="space-y-2">
                                        {paymentMethodsForDisplay.map((method) => (
                                            <div
                                                key={`${method.paymentMethodID ?? method.type}-${method.name}`}
                                                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900"
                                            >
                                                <span>
                                                    {method.name} · {method.paymentCount} cobros
                                                </span>
                                                <strong>{toCLP(method.totalAmount)}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            <div className="border-t border-slate-200 pt-5 dark:border-slate-700">
                                <p className="mb-4 text-sm font-bold text-slate-900 dark:text-white">
                                    Cierre rápido del turno
                                </p>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="counted-cash" className="mb-2 block">
                                            Efectivo contado
                                        </Label>
                                        <CurrencyInput
                                            id="counted-cash"
                                            value={countedCashBalance}
                                            onValueChange={setCountedCashBalance}
                                            placeholder="$ 0"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="closing-time" className="mb-2 block">
                                            Hora de cierre
                                        </Label>
                                        <Input
                                            id="closing-time"
                                            value={currentTime}
                                            disabled
                                            className="disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="closing-notes" className="mb-2 block">
                                            Notas de cierre
                                        </Label>
                                        <Textarea
                                            id="closing-notes"
                                            value={closingNotes}
                                            onChange={(event) => setClosingNotes(event.target.value)}
                                            placeholder="Justifica diferencias si corresponde"
                                        />
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                    También puedes realizar un arqueo detallado usando el botón de denominaciones.
                                </p>
                            </div>
                        </form>
                    )}

                    <div className="mt-7 border-t border-slate-200 pt-5 dark:border-slate-700">
                        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                            <History className="h-4 w-4" /> Historial reciente
                        </div>
                        {isLoadingDetail ? (
                            <p className="text-sm text-slate-500">Cargando historial...</p>
                        ) : history.length ? (
                            <div className="space-y-2">
                                {history.slice(0, 5).map((session) => {
                                    const expanded = historySummarySessionID === session.sessionID
                                    return (
                                        <div
                                            key={session.sessionID}
                                            className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => void handleHistorySummary(session)}
                                                className="grid w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-900 sm:grid-cols-[1fr_auto_auto_auto]"
                                                aria-expanded={expanded}
                                            >
                                                <span className="font-medium">{session.businessDate}</span>
                                                <Badge variant="outline">
                                                    {session.status === "OPEN"
                                                        ? "Abierta"
                                                        : session.status === "CLOSED"
                                                          ? "Cerrada"
                                                          : "Suspendida"}
                                                </Badge>
                                                <span
                                                    className={
                                                        session.cashDifference && session.cashDifference !== 0
                                                            ? "font-semibold text-red-600"
                                                            : "text-slate-500"
                                                    }
                                                >
                                                    Diferencia: {toCLP(session.cashDifference)}
                                                </span>
                                                <ChevronDown
                                                    className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                                                />
                                            </button>
                                            {expanded ? (
                                                <div className="border-t border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                                                    <div className="mb-3 grid gap-2 sm:grid-cols-3">
                                                        <HistoryDetail label="Inicio del turno" value={formatDateTime(session.openedAt)} />
                                                        <HistoryDetail
                                                            label="Cierre del turno"
                                                            value={session.closedAt ? formatDateTime(session.closedAt) : "Pendiente"}
                                                        />
                                                        <HistoryDetail
                                                            label="Cerrado por"
                                                            value={getClosingUserName(
                                                                session.closedByUserID,
                                                                storeUsers,
                                                                currentUser,
                                                                historySummary,
                                                            )}
                                                        />
                                                    </div>
                                                    {isLoadingHistorySummary || !historySummary ? (
                                                        <p className="text-xs text-slate-500">Cargando resumen de la sesión...</p>
                                                    ) : (
                                                        <SessionSummaryDetails summary={historySummary} />
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">Sin sesiones anteriores.</p>
                        )}
                    </div>
                </div>

                <DialogFooter className="border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button
                        form={
                            !activeSession
                                ? "cash-session-form"
                                : view === "movement"
                                  ? "cash-movement-form"
                                  : view === "count"
                                    ? "cash-count-form"
                                    : "cash-session-form"
                        }
                        type="submit"
                        className={
                            activeSession
                                ? view === "movement"
                                    ? "bg-slate-800 text-white hover:bg-slate-900"
                                    : "bg-red-700 text-white hover:bg-red-800"
                                : "bg-emerald-700 text-white hover:bg-emerald-800"
                        }
                        disabled={isSubmitting || (!activeSession && (isLoadingDetail || !selectedSellerID))}
                    >
                        {isSubmitting
                            ? "Guardando..."
                            : !activeSession
                              ? "Abrir turno"
                              : view === "movement"
                                ? "Registrar movimiento"
                                : view === "count"
                                  ? "Completar arqueo y cerrar"
                                  : "Cerrar turno"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function CashFlowMetric({
    label,
    value,
    icon: Icon,
    tone = "neutral",
    action,
}: {
    label: string
    value: string
    icon: typeof Banknote
    tone?: "neutral" | "positive" | "negative" | "subtotal" | "total"
    action?: ReactNode
}) {
    const toneClassNames = {
        neutral: "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
        positive: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
        negative: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40",
        subtotal: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40",
        total: "border-emerald-300 bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60",
    }

    return (
        <div className={`min-w-0 rounded-lg border p-2.5 sm:p-3 ${toneClassNames[tone]}`}>
            <Icon className="h-4 w-4 text-emerald-700" />
            <p className="mt-2 wrap-break-word text-base font-black leading-tight text-slate-900 dark:text-white sm:text-lg">
                {value}
            </p>
            <p className="mt-1 text-[11px] leading-tight text-slate-500 sm:text-xs">{label}</p>
            {action}
        </div>
    )
}

function FlowOperator({ symbol }: { symbol: "+" | "−" | "=" }) {
    return (
        <span
            aria-hidden="true"
            className="flex items-center justify-center text-base font-black text-slate-400 sm:text-xl"
        >
            {symbol}
        </span>
    )
}

function SessionSummaryDetails({ summary }: { summary: ICashSessionSummary }) {
    return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <HistoryMetric label="Monto inicial" value={toCLP(summary.expected.openingBalance)} />
            <HistoryMetric label="Entradas" value={toCLP(summary.cashMovements.cashIn)} />
            <HistoryMetric label="Egresos" value={toCLP(summary.cashMovements.cashOut)} />
            <HistoryMetric label="Efectivo esperado" value={toCLP(summary.expected.expectedCashAmount)} />
            <HistoryMetric label="Cobros" value={toCLP(summary.payments.totalAmount)} />
        </div>
    )
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-800">
            <p className="font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="mt-0.5 text-[10px] leading-tight text-slate-500">{label}</p>
        </div>
    )
}

function HistoryDetail({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0 rounded-md border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 break-words text-xs font-semibold text-slate-900 dark:text-white">{value}</p>
        </div>
    )
}

function CashInDetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-md bg-emerald-50 px-3 py-2 text-xs dark:bg-emerald-950/30">
            <span className="text-slate-600 dark:text-slate-300">{label}</span>
            <strong className="text-slate-950 dark:text-white">{value}</strong>
        </div>
    )
}
