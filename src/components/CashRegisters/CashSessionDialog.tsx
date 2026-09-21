"use client"

import { FormEvent, useEffect, useState } from "react"
import {
    closeCashSession,
    completeCashClosing,
    completeCashCount,
    createCashMovement,
    getCashSessions,
    getCashSessionSummary,
    getCurrentCashClosing,
    getCurrentCashCount,
    openCashSession,
    startCashClosing,
    startCashCount,
    updateCashCountItems,
} from "@/actions/cash-registers/cashRegisters"
import { getCashDenominations, getCashMovementReasons } from "@/actions/cash-registers/cashCatalogs"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CashMovementType, ICashDenomination, ICashMovementReason } from "@/interfaces/cash-registers/ICashCatalogs"
import type { ICashRegister, ICashSession, ICashSessionSummary } from "@/interfaces/cash-registers/ICashRegister"
import { ArrowDownToLine, ArrowLeft, Banknote, Calculator, CreditCard, History } from "lucide-react"
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
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(date)
}

type CashSessionDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    register: ICashRegister | null
    activeSession: ICashSession | null
    onChanged: () => Promise<void> | void
}

export default function CashSessionDialog({ open, onOpenChange, register, activeSession, onChanged }: CashSessionDialogProps) {
    const [view, setView] = useState<"main" | "movement" | "count">("main")
    const [businessDate, setBusinessDate] = useState(toLocalDate)
    const [openingBalance, setOpeningBalance] = useState("")
    const [openingNotes, setOpeningNotes] = useState("")
    const [countedCashBalance, setCountedCashBalance] = useState("")
    const [closingNotes, setClosingNotes] = useState("")
    const [summary, setSummary] = useState<ICashSessionSummary | null>(null)
    const [history, setHistory] = useState<ICashSession[]>([])
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
        if (!open || !register) return
        setBusinessDate(toLocalDate())
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
        setHistory([])

        let cancelled = false
        setIsLoadingDetail(true)
        const requests: Promise<unknown>[] = [
            getCashSessions(register.cashRegisterID).then((sessions) => {
                if (!cancelled) setHistory(sessions)
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
            toast.error("Ingresa un fondo inicial válido")
            return
        }
        setIsSubmitting(true)
        try {
            await openCashSession(register.cashRegisterID, {
                businessDate,
                openingBalance: balance,
                ...(openingNotes.trim() ? { openingNotes: openingNotes.trim() } : {}),
            })
            toast.success("Turno de caja abierto")
            await onChanged()
            onOpenChange(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo abrir el turno")
        } finally {
            setIsSubmitting(false)
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
                    <DialogTitle>{register.name}</DialogTitle>
                    <DialogDescription>{register.code} · {activeSession ? "Turno abierto" : "Sin turno activo"}</DialogDescription>
                </DialogHeader>

                <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                    {!activeSession ? (
                        <form id="cash-session-form" onSubmit={handleOpen} className="space-y-5">
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                Abre un turno operativo indicando la fecha contable y el fondo inicial.
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="business-date" className="mb-2 block">Fecha contable</Label>
                                    <Input id="business-date" type="date" value={businessDate} onChange={(event) => setBusinessDate(event.target.value)} required />
                                </div>
                                <div>
                                    <Label htmlFor="opening-balance" className="mb-2 block">Fondo inicial</Label>
                                    <Input id="opening-balance" type="number" min={0} step={1} value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} placeholder="0" required />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="opening-notes" className="mb-2 block">Notas de apertura</Label>
                                <Textarea id="opening-notes" value={openingNotes} onChange={(event) => setOpeningNotes(event.target.value)} placeholder="Observaciones opcionales" />
                            </div>
                        </form>
                    ) : view === "movement" ? (
                        <form id="cash-movement-form" onSubmit={handleMovement} className="space-y-5">
                            <button type="button" onClick={() => setView("main")} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300">
                                <ArrowLeft className="h-4 w-4" /> Volver al turno
                            </button>
                            <div>
                                <h3 className="font-bold text-slate-950 dark:text-white">Movimiento manual de efectivo</h3>
                                <p className="mt-1 text-sm text-slate-500">Registra una entrada o salida usando una razón activa del catálogo.</p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label className="mb-2 block">Tipo</Label>
                                    <Select value={movementType} onValueChange={(value: CashMovementType) => { setMovementType(value); setMovementReason("") }}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="CASH_IN">Entrada de efectivo</SelectItem><SelectItem value="CASH_OUT">Salida de efectivo</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="movement-amount" className="mb-2 block">Monto</Label>
                                    <Input id="movement-amount" type="number" min={1} step={1} value={movementAmount} onChange={(event) => setMovementAmount(event.target.value)} required />
                                </div>
                            </div>
                            <div>
                                <Label className="mb-2 block">Razón</Label>
                                <Select value={movementReason} onValueChange={setMovementReason}>
                                    <SelectTrigger><SelectValue placeholder="Selecciona una razón" /></SelectTrigger>
                                    <SelectContent>{applicableReasons.map((reason) => <SelectItem key={reason.cashMovementReasonID} value={reason.code}>{reason.name}{reason.requiresApproval ? " · Requiere supervisor" : ""}</SelectItem>)}</SelectContent>
                                </Select>
                                {!applicableReasons.length && <p className="mt-2 text-xs text-amber-700">No hay razones activas para este movimiento. Configúralas en Catálogos de caja.</p>}
                            </div>
                            <div>
                                <Label htmlFor="movement-description" className="mb-2 block">Descripción</Label>
                                <Textarea id="movement-description" value={movementDescription} onChange={(event) => setMovementDescription(event.target.value)} placeholder="Justificación u observación opcional" maxLength={500} />
                            </div>
                        </form>
                    ) : view === "count" ? (
                        <form id="cash-count-form" onSubmit={handleDetailedCount} className="space-y-5">
                            <button type="button" onClick={() => setView("main")} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300">
                                <ArrowLeft className="h-4 w-4" /> Volver al turno
                            </button>
                            <div className="flex flex-wrap items-end justify-between gap-3">
                                <div><h3 className="font-bold text-slate-950 dark:text-white">Arqueo por denominaciones</h3><p className="mt-1 text-sm text-slate-500">Cuenta billetes y monedas. Al completar, el turno quedará cerrado.</p></div>
                                <div className="rounded-lg bg-emerald-50 px-4 py-2 text-right"><p className="text-xs font-semibold text-emerald-700">Total contado</p><p className="text-xl font-black text-emerald-900">{toCLP(countTotal)}</p></div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {denominations.map((denomination) => (
                                    <div key={denomination.cashDenominationID} className="grid grid-cols-[1fr_100px] items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                                        <div><p className="font-semibold text-slate-900 dark:text-white">{denomination.label || toCLP(denomination.value)}</p><p className="text-xs text-slate-500">{denomination.type === "BANKNOTE" ? "Billete" : "Moneda"}</p></div>
                                        <Input aria-label={`Cantidad de ${denomination.label}`} type="number" min={0} step={1} value={quantities[denomination.cashDenominationID] ?? ""} onChange={(event) => setQuantities((current) => ({ ...current, [denomination.cashDenominationID]: event.target.value }))} placeholder="0" />
                                    </div>
                                ))}
                            </div>
                            <div><Label htmlFor="count-notes" className="mb-2 block">Notas del arqueo</Label><Textarea id="count-notes" value={countNotes} onChange={(event) => setCountNotes(event.target.value)} placeholder="Justifica cualquier diferencia" maxLength={500} /></div>
                        </form>
                    ) : (
                        <form id="cash-session-form" onSubmit={handleClose} className="space-y-6">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <Metric label="Fondo inicial" value={toCLP(summary?.expected.openingBalance ?? activeSession.openingBalance)} icon={Banknote} />
                                <Metric label="Efectivo esperado" value={toCLP(summary?.expected.expectedCashAmount)} icon={Calculator} />
                                <Metric label="Cobros" value={toCLP(summary?.payments.totalAmount)} icon={CreditCard} />
                                <Metric label="Movimientos netos" value={toCLP(summary?.cashMovements.net)} icon={ArrowDownToLine} />
                            </div>

                            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-xs font-bold uppercase text-slate-500">Turno activo</p>
                                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">Abierto {formatDateTime(activeSession.openedAt)}</p>
                                    </div>
                                    <Badge className="bg-emerald-100 text-emerald-800">Abierto</Badge>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <Button type="button" variant="outline" onClick={() => void openMovementView()} disabled={isLoadingDetail}>
                                    <ArrowDownToLine className="h-4 w-4" /> Movimiento manual
                                </Button>
                                <Button type="button" variant="outline" onClick={() => void openCountView()} disabled={isLoadingDetail}>
                                    <Calculator className="h-4 w-4" /> Arqueo por denominaciones
                                </Button>
                            </div>

                            {summary?.payments.byMethod.length ? (
                                <div>
                                    <p className="mb-3 text-xs font-bold uppercase text-slate-500">Cobros del turno</p>
                                    <div className="space-y-2">
                                        {summary.payments.byMethod.map((method) => (
                                            <div key={`${method.paymentMethodID ?? method.type}-${method.name}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
                                                <span>{method.name} · {method.paymentCount} cobros</span>
                                                <strong>{toCLP(method.totalAmount)}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            <div className="border-t border-slate-200 pt-5 dark:border-slate-700">
                                <p className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Cierre rápido del turno</p>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="counted-cash" className="mb-2 block">Efectivo contado</Label>
                                        <Input id="counted-cash" type="number" min={0} step={1} value={countedCashBalance} onChange={(event) => setCountedCashBalance(event.target.value)} placeholder="0" required />
                                    </div>
                                    <div>
                                        <Label htmlFor="closing-notes" className="mb-2 block">Notas de cierre</Label>
                                        <Textarea id="closing-notes" value={closingNotes} onChange={(event) => setClosingNotes(event.target.value)} placeholder="Justifica diferencias si corresponde" />
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-slate-500">También puedes realizar un arqueo detallado usando el botón de denominaciones.</p>
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
                                {history.slice(0, 5).map((session) => (
                                    <div key={session.sessionID} className="grid gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 sm:grid-cols-[1fr_auto_auto]">
                                        <span>{session.businessDate}</span>
                                        <Badge variant="outline">{session.status === "OPEN" ? "Abierta" : session.status === "CLOSED" ? "Cerrada" : "Suspendida"}</Badge>
                                        <span className={session.cashDifference && session.cashDifference !== 0 ? "font-semibold text-red-600" : "text-slate-500"}>
                                            Diferencia: {toCLP(session.cashDifference)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">Sin sesiones anteriores.</p>
                        )}
                    </div>
                </div>

                <DialogFooter className="border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
                    <Button
                        form={!activeSession ? "cash-session-form" : view === "movement" ? "cash-movement-form" : view === "count" ? "cash-count-form" : "cash-session-form"}
                        type="submit"
                        className={activeSession ? view === "movement" ? "bg-slate-800 text-white hover:bg-slate-900" : "bg-red-700 text-white hover:bg-red-800" : "bg-emerald-700 text-white hover:bg-emerald-800"}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Guardando..." : !activeSession ? "Abrir turno" : view === "movement" ? "Registrar movimiento" : view === "count" ? "Completar arqueo y cerrar" : "Cerrar turno"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Banknote }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
            <Icon className="h-4 w-4 text-emerald-700" />
            <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
        </div>
    )
}
