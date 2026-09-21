"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import {
    createCashDenomination,
    createCashMovementReason,
    createDefaultCashDenominations,
    createDefaultCashMovementReasons,
    createDefaultPaymentMethods,
    createPaymentMethod,
    getCashDenominations,
    getCashMovementReasons,
    getPaymentMethods,
    updateCashDenomination,
    updateCashMovementReason,
    updatePaymentMethod,
} from "@/actions/cash-registers/cashCatalogs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type {
    CashDenominationType,
    CashMovementType,
    ICashDenomination,
    ICashMovementReason,
    IPaymentMethod,
    PaymentMethodType,
} from "@/interfaces/cash-registers/ICashCatalogs"
import { Banknote, CreditCard, Edit3, Loader2, Plus, RotateCcw } from "lucide-react"
import { toast } from "sonner"

type CatalogTab = "payments" | "reasons" | "denominations"

const paymentTypeLabels: Record<PaymentMethodType, string> = {
    CASH: "Efectivo",
    DEBIT_CARD: "Tarjeta de débito",
    CREDIT_CARD: "Tarjeta de crédito",
    BANK_TRANSFER: "Transferencia bancaria",
    CHECK: "Cheque",
    CREDIT: "Crédito",
    OTHER: "Otro",
}

const money = (value: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value)

type Props = { open: boolean; onOpenChange: (open: boolean) => void }

export default function CashCatalogsDialog({ open, onOpenChange }: Props) {
    const [tab, setTab] = useState<CatalogTab>("payments")
    const [payments, setPayments] = useState<IPaymentMethod[]>([])
    const [reasons, setReasons] = useState<ICashMovementReason[]>([])
    const [denominations, setDenominations] = useState<ICashDenomination[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [editingID, setEditingID] = useState<string | null>(null)

    const [paymentForm, setPaymentForm] = useState({ code: "", name: "", type: "CASH" as PaymentMethodType, affectsCash: true })
    const [reasonForm, setReasonForm] = useState({ code: "", name: "", type: "BOTH" as CashMovementType | "BOTH", requiresApproval: false })
    const [denominationForm, setDenominationForm] = useState({ value: "", type: "BANKNOTE" as CashDenominationType, label: "", sortOrder: "0" })

    const loadCatalogs = useCallback(async () => {
        setLoading(true)
        try {
            const [nextPayments, nextReasons, nextDenominations] = await Promise.all([
                getPaymentMethods(),
                getCashMovementReasons(),
                getCashDenominations(),
            ])
            setPayments(nextPayments)
            setReasons(nextReasons)
            setDenominations(nextDenominations)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudieron cargar los catálogos")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (open) void loadCatalogs()
    }, [loadCatalogs, open])

    const resetForm = () => {
        setShowForm(false)
        setEditingID(null)
        setPaymentForm({ code: "", name: "", type: "CASH", affectsCash: true })
        setReasonForm({ code: "", name: "", type: "BOTH", requiresApproval: false })
        setDenominationForm({ value: "", type: "BANKNOTE", label: "", sortOrder: "0" })
    }

    const changeTab = (next: CatalogTab) => {
        setTab(next)
        resetForm()
    }

    const createDefaults = async () => {
        setSaving(true)
        try {
            if (tab === "payments") await createDefaultPaymentMethods()
            if (tab === "reasons") await createDefaultCashMovementReasons()
            if (tab === "denominations") await createDefaultCashDenominations()
            toast.success("Catálogo estándar disponible")
            await loadCatalogs()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo generar el catálogo")
        } finally {
            setSaving(false)
        }
    }

    const submitPayment = async (event: FormEvent) => {
        event.preventDefault()
        if (!paymentForm.name.trim() || (!editingID && !paymentForm.code.trim())) return
        setSaving(true)
        try {
            if (editingID) {
                await updatePaymentMethod(editingID, { name: paymentForm.name.trim(), type: paymentForm.type, affectsCash: paymentForm.type === "CASH" && paymentForm.affectsCash })
            } else {
                await createPaymentMethod({ code: paymentForm.code.trim(), name: paymentForm.name.trim(), type: paymentForm.type, affectsCash: paymentForm.type === "CASH" && paymentForm.affectsCash })
            }
            toast.success(editingID ? "Medio de pago actualizado" : "Medio de pago creado")
            resetForm()
            await loadCatalogs()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar el medio de pago")
        } finally {
            setSaving(false)
        }
    }

    const submitReason = async (event: FormEvent) => {
        event.preventDefault()
        if (!reasonForm.name.trim() || (!editingID && !reasonForm.code.trim())) return
        setSaving(true)
        try {
            const type = reasonForm.type === "BOTH" ? null : reasonForm.type
            if (editingID) {
                await updateCashMovementReason(editingID, { name: reasonForm.name.trim(), type, requiresApproval: reasonForm.requiresApproval })
            } else {
                await createCashMovementReason({ code: reasonForm.code.trim(), name: reasonForm.name.trim(), type, requiresApproval: reasonForm.requiresApproval })
            }
            toast.success(editingID ? "Razón actualizada" : "Razón creada")
            resetForm()
            await loadCatalogs()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar la razón")
        } finally {
            setSaving(false)
        }
    }

    const submitDenomination = async (event: FormEvent) => {
        event.preventDefault()
        const value = Number(denominationForm.value)
        const sortOrder = Number(denominationForm.sortOrder)
        if ((!editingID && (!Number.isFinite(value) || value <= 0)) || !Number.isFinite(sortOrder)) return
        setSaving(true)
        try {
            if (editingID) {
                await updateCashDenomination(editingID, { label: denominationForm.label.trim() || undefined, sortOrder })
            } else {
                await createCashDenomination({ value, type: denominationForm.type, label: denominationForm.label.trim() || undefined, sortOrder })
            }
            toast.success(editingID ? "Denominación actualizada" : "Denominación creada")
            resetForm()
            await loadCatalogs()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar la denominación")
        } finally {
            setSaving(false)
        }
    }

    const toggleActive = async (kind: CatalogTab, id: string, active: boolean) => {
        try {
            if (kind === "payments") await updatePaymentMethod(id, { active })
            if (kind === "reasons") await updateCashMovementReason(id, { active })
            if (kind === "denominations") await updateCashDenomination(id, { active })
            await loadCatalogs()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
                    <DialogTitle>Catálogos de caja</DialogTitle>
                    <DialogDescription>Configura medios de pago, razones de movimiento y valores para arqueos.</DialogDescription>
                </DialogHeader>

                <div className="flex flex-wrap gap-2 border-b border-slate-200 px-6 py-3 dark:border-slate-700">
                    <TabButton active={tab === "payments"} onClick={() => changeTab("payments")}><CreditCard className="h-4 w-4" /> Medios de pago</TabButton>
                    <TabButton active={tab === "reasons"} onClick={() => changeTab("reasons")}><Banknote className="h-4 w-4" /> Razones</TabButton>
                    <TabButton active={tab === "denominations"} onClick={() => changeTab("denominations")}><span className="font-black">$</span> Denominaciones</TabButton>
                </div>

                <div className="max-h-[68vh] overflow-y-auto px-6 py-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-slate-500">Los códigos y valores usados históricamente son inmutables.</p>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => void createDefaults()} disabled={saving}><RotateCcw className="h-4 w-4" /> Cargar estándar</Button>
                            <Button type="button" size="sm" onClick={() => { resetForm(); setShowForm(true) }}><Plus className="h-4 w-4" /> Nuevo</Button>
                        </div>
                    </div>

                    {showForm && tab === "payments" && (
                        <form onSubmit={submitPayment} className="mb-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-2">
                            <Field label="Código"><Input value={paymentForm.code} onChange={(event) => setPaymentForm((form) => ({ ...form, code: event.target.value }))} disabled={Boolean(editingID)} required /></Field>
                            <Field label="Nombre"><Input value={paymentForm.name} onChange={(event) => setPaymentForm((form) => ({ ...form, name: event.target.value }))} required /></Field>
                            <Field label="Tipo"><Select value={paymentForm.type} onValueChange={(value: PaymentMethodType) => setPaymentForm((form) => ({ ...form, type: value, affectsCash: value === "CASH" }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(paymentTypeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
                            <label className="flex items-center gap-2 text-sm"><Switch checked={paymentForm.affectsCash} disabled={paymentForm.type !== "CASH"} onCheckedChange={(checked) => setPaymentForm((form) => ({ ...form, affectsCash: checked }))} /> Afecta el efectivo físico</label>
                            <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button><Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button></div>
                        </form>
                    )}

                    {showForm && tab === "reasons" && (
                        <form onSubmit={submitReason} className="mb-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-2">
                            <Field label="Código"><Input value={reasonForm.code} onChange={(event) => setReasonForm((form) => ({ ...form, code: event.target.value }))} disabled={Boolean(editingID)} required /></Field>
                            <Field label="Nombre"><Input value={reasonForm.name} onChange={(event) => setReasonForm((form) => ({ ...form, name: event.target.value }))} required /></Field>
                            <Field label="Sentido"><Select value={reasonForm.type} onValueChange={(value: CashMovementType | "BOTH") => setReasonForm((form) => ({ ...form, type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BOTH">Entrada y salida</SelectItem><SelectItem value="CASH_IN">Entrada</SelectItem><SelectItem value="CASH_OUT">Salida</SelectItem></SelectContent></Select></Field>
                            <label className="flex items-center gap-2 text-sm"><Switch checked={reasonForm.requiresApproval} onCheckedChange={(checked) => setReasonForm((form) => ({ ...form, requiresApproval: checked }))} /> Requiere supervisor</label>
                            <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button><Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button></div>
                        </form>
                    )}

                    {showForm && tab === "denominations" && (
                        <form onSubmit={submitDenomination} className="mb-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-2">
                            <Field label="Valor"><Input type="number" min={1} step={1} value={denominationForm.value} onChange={(event) => setDenominationForm((form) => ({ ...form, value: event.target.value }))} disabled={Boolean(editingID)} required={!editingID} /></Field>
                            <Field label="Tipo"><Select value={denominationForm.type} disabled={Boolean(editingID)} onValueChange={(value: CashDenominationType) => setDenominationForm((form) => ({ ...form, type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BANKNOTE">Billete</SelectItem><SelectItem value="COIN">Moneda</SelectItem></SelectContent></Select></Field>
                            <Field label="Etiqueta"><Input value={denominationForm.label} onChange={(event) => setDenominationForm((form) => ({ ...form, label: event.target.value }))} placeholder="Se genera automáticamente" /></Field>
                            <Field label="Orden"><Input type="number" min={0} max={1000} value={denominationForm.sortOrder} onChange={(event) => setDenominationForm((form) => ({ ...form, sortOrder: event.target.value }))} /></Field>
                            <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button><Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button></div>
                        </form>
                    )}

                    {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div> : (
                        <div className="space-y-2">
                            {tab === "payments" && payments.map((item) => (
                                <CatalogRow key={item.paymentMethodID} title={item.name} subtitle={`${item.code} · ${paymentTypeLabels[item.type]}${item.affectsCash ? " · Afecta efectivo" : ""}`} active={item.active} onToggle={(active) => void toggleActive(tab, item.paymentMethodID, active)} onEdit={() => { setEditingID(item.paymentMethodID); setPaymentForm({ code: item.code, name: item.name, type: item.type, affectsCash: item.affectsCash }); setShowForm(true) }} />
                            ))}
                            {tab === "reasons" && reasons.map((item) => (
                                <CatalogRow key={item.cashMovementReasonID} title={item.name} subtitle={`${item.code} · ${item.type === "CASH_IN" ? "Entrada" : item.type === "CASH_OUT" ? "Salida" : "Entrada y salida"}`} badge={item.requiresApproval ? "Requiere supervisor" : undefined} active={item.active} onToggle={(active) => void toggleActive(tab, item.cashMovementReasonID, active)} onEdit={() => { setEditingID(item.cashMovementReasonID); setReasonForm({ code: item.code, name: item.name, type: item.type ?? "BOTH", requiresApproval: item.requiresApproval }); setShowForm(true) }} />
                            ))}
                            {tab === "denominations" && denominations.map((item) => (
                                <CatalogRow key={item.cashDenominationID} title={item.label || money(item.value)} subtitle={`${item.type === "BANKNOTE" ? "Billete" : "Moneda"} · Orden ${item.sortOrder}`} active={item.active} onToggle={(active) => void toggleActive(tab, item.cashDenominationID, active)} onEdit={() => { setEditingID(item.cashDenominationID); setDenominationForm({ value: String(item.value), type: item.type, label: item.label, sortOrder: String(item.sortOrder) }); setShowForm(true) }} />
                            ))}
                            {(tab === "payments" ? payments : tab === "reasons" ? reasons : denominations).length === 0 && <p className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">El catálogo está vacío. Puedes cargar el estándar recomendado.</p>}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return <Button type="button" variant={active ? "default" : "ghost"} size="sm" onClick={onClick} className={active ? "bg-slate-800 text-white" : ""}>{children}</Button>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><Label className="mb-2 block">{label}</Label>{children}</div>
}

function CatalogRow({ title, subtitle, badge, active, onToggle, onEdit }: { title: string; subtitle: string; badge?: string; active: boolean; onToggle: (active: boolean) => void; onEdit: () => void }) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900 dark:text-white">{title}</p>{badge && <Badge variant="outline">{badge}</Badge>}</div><p className="truncate text-xs text-slate-500">{subtitle}</p></div>
            <Switch checked={active} onCheckedChange={onToggle} aria-label={active ? "Desactivar" : "Activar"} />
            <Button type="button" variant="ghost" size="icon" onClick={onEdit} title="Editar"><Edit3 className="h-4 w-4" /></Button>
        </div>
    )
}
