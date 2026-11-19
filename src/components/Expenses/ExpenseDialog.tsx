"use client"

import { useEffect, useState, type FormEvent } from "react"
import { createExpense } from "@/actions/expenses/createExpense"
import { updateExpense } from "@/actions/expenses/updateExpense"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ExpenseType, ICreateExpense, IExpense } from "@/interfaces/expenses/IExpense"
import type { IStore } from "@/interfaces/stores/IStore"
import { EXPENSE_TYPE_OPTIONS, IVA_RATE, formatCLP, toDateInputValue } from "./expenses.utils"
import { toast } from "sonner"

type ExpenseFormState = {
    name: string
    deductibleDate: string
    netAmount: string
    taxAmount: string
    type: ExpenseType | ""
    storeID: string
    supportDocument: string
    acceptedForTax: boolean
    taxCredit: boolean
}

type ExpenseDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    expense?: IExpense | null
    stores: IStore[]
    defaultStoreID?: string
    onSaved: (expense: IExpense) => void | Promise<void>
}

const todayInputValue = () => new Date().toISOString().split("T")[0]

const buildEmptyForm = (defaultStoreID?: string): ExpenseFormState => ({
    name: "",
    deductibleDate: todayInputValue(),
    netAmount: "",
    taxAmount: "",
    type: "",
    storeID: defaultStoreID ?? "",
    supportDocument: "",
    acceptedForTax: true,
    taxCredit: true,
})

const toFormState = (expense: IExpense): ExpenseFormState => ({
    name: expense.name,
    deductibleDate: toDateInputValue(expense.deductibleDate) || todayInputValue(),
    netAmount: String(expense.netAmount),
    taxAmount: String(expense.taxAmount),
    type: expense.type,
    storeID: expense.storeID,
    supportDocument: expense.supportDocument ?? "",
    acceptedForTax: expense.acceptedForTax,
    taxCredit: expense.taxCredit,
})

const parseAmount = (value: string): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

export default function ExpenseDialog({ open, onOpenChange, expense, stores, defaultStoreID, onSaved }: ExpenseDialogProps) {
    const [form, setForm] = useState<ExpenseFormState>(() => (expense ? toFormState(expense) : buildEmptyForm(defaultStoreID)))
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (open) {
            setForm(expense ? toFormState(expense) : buildEmptyForm(defaultStoreID))
        }
    }, [open, expense, defaultStoreID])

    const updateField = <K extends keyof ExpenseFormState>(field: K, value: ExpenseFormState[K]) => {
        setForm((current) => ({ ...current, [field]: value }))
    }

    const netAmount = parseAmount(form.netAmount)
    const taxAmount = parseAmount(form.taxAmount)
    const totalAmount = netAmount + taxAmount

    const applyIva19 = () => {
        if (netAmount <= 0) {
            toast.error("Primero ingresa el monto neto para calcular el IVA")
            return
        }
        updateField("taxAmount", String(Math.round(netAmount * IVA_RATE)))
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!form.name.trim()) {
            toast.error("El nombre del gasto es obligatorio")
            return
        }
        if (!form.type) {
            toast.error("Debes seleccionar una categoría")
            return
        }
        if (!form.deductibleDate) {
            toast.error("Debes seleccionar la fecha del gasto")
            return
        }
        if (netAmount < 0 || taxAmount < 0) {
            toast.error("Los montos no pueden ser negativos")
            return
        }
        if (totalAmount <= 0) {
            toast.error("El monto total debe ser mayor a 0")
            return
        }
        if (!form.storeID) {
            toast.error("Debes seleccionar una tienda")
            return
        }

        setIsSaving(true)
        try {
            const payload: ICreateExpense = {
                name: form.name.trim(),
                deductibleDate: new Date(form.deductibleDate).toISOString(),
                netAmount,
                taxAmount,
                type: form.type,
                storeID: form.storeID,
                acceptedForTax: form.acceptedForTax,
                taxCredit: form.taxCredit,
                supportDocument: form.supportDocument.trim() || undefined,
            }
            const savedExpense = expense
                ? await updateExpense(expense.expenseID, payload)
                : await createExpense(payload)
            toast.success(expense ? "Gasto actualizado correctamente" : "Gasto creado correctamente")
            onOpenChange(false)
            try {
                await onSaved(savedExpense)
            } catch {
                toast.warning("El gasto se guardó, pero no se pudo actualizar la vista")
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar el gasto")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
            <DialogContent className="max-w-2xl">
                <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
                    <DialogTitle>{expense ? "Editar gasto" : "Agregar gasto"}</DialogTitle>
                    <DialogDescription>
                        Registra el gasto con su monto neto e IVA. El total lo calcula el sistema al guardar.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="max-h-[72vh] overflow-y-auto px-6 py-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <Label htmlFor="expense-name">Nombre del gasto *</Label>
                            <Input
                                id="expense-name"
                                type="text"
                                value={form.name}
                                onChange={(event) => updateField("name", event.target.value)}
                                placeholder="Ej: Servicios Básicos - Electricidad"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="expense-type">Categoría *</Label>
                            <Select value={form.type} onValueChange={(value) => updateField("type", value as ExpenseType)}>
                                <SelectTrigger id="expense-type">
                                    <SelectValue placeholder="Selecciona una categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EXPENSE_TYPE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="expense-store">Tienda *</Label>
                            <Select value={form.storeID} onValueChange={(value) => updateField("storeID", value)}>
                                <SelectTrigger id="expense-store">
                                    <SelectValue placeholder="Selecciona una tienda" />
                                </SelectTrigger>
                                <SelectContent>
                                    {stores.map((store) => (
                                        <SelectItem key={store.storeID} value={store.storeID}>
                                            {store.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {stores.length === 0 && (
                                <p className="mt-1 text-xs text-amber-600">No hay tiendas disponibles para registrar el gasto.</p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="expense-date">Fecha del gasto *</Label>
                            <Input
                                id="expense-date"
                                type="date"
                                value={form.deductibleDate}
                                onChange={(event) => updateField("deductibleDate", event.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="expense-document">Documento de respaldo</Label>
                            <Input
                                id="expense-document"
                                type="text"
                                value={form.supportDocument}
                                onChange={(event) => updateField("supportDocument", event.target.value)}
                                placeholder="Ej: F-1234"
                            />
                        </div>

                        <div>
                            <Label htmlFor="expense-net">Monto neto (sin IVA) *</Label>
                            <CurrencyInput
                                id="expense-net"
                                value={form.netAmount}
                                onValueChange={(value) => updateField("netAmount", value)}
                                placeholder="$ 0"
                                allowDecimals
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="expense-tax">IVA *</Label>
                            <div className="flex gap-2">
                                <CurrencyInput
                                    id="expense-tax"
                                    value={form.taxAmount}
                                    onValueChange={(value) => updateField("taxAmount", value)}
                                    placeholder="$ 0"
                                    allowDecimals
                                    required
                                />
                                <Button type="button" variant="outline" onClick={applyIva19} disabled={isSaving}>
                                    IVA 19%
                                </Button>
                            </div>
                        </div>

                        <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                            <span className="text-slate-500 dark:text-slate-400">Total del gasto: </span>
                            <span className="font-semibold text-slate-900 dark:text-white">{formatCLP(totalAmount)}</span>
                            <span className="text-slate-500 dark:text-slate-400">
                                {" "}
                                (neto {formatCLP(netAmount)} + IVA {formatCLP(taxAmount)})
                            </span>
                        </div>

                        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                            <Checkbox
                                checked={form.acceptedForTax}
                                onCheckedChange={(checked) => updateField("acceptedForTax", checked === true)}
                            />
                            Aceptado para efectos tributarios (Art. 31 LIR)
                        </label>

                        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                            <Checkbox
                                checked={form.taxCredit}
                                onCheckedChange={(checked) => updateField("taxCredit", checked === true)}
                            />
                            IVA con derecho a crédito fiscal
                        </label>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSaving} className="bg-green-600 text-white hover:bg-green-700">
                            {isSaving ? "Guardando..." : expense ? "Guardar cambios" : "Agregar gasto"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
