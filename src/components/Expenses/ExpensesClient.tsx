"use client"

import { useEffect, useMemo, useState } from "react"
import { deleteExpense } from "@/actions/expenses/deleteExpense"
import { getAllExpenses } from "@/actions/expenses/getAllExpenses"
import { getExpensesSummary } from "@/actions/expenses/getExpensesSummary"
import ExpenseDialog from "@/components/Expenses/ExpenseDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ExpenseType, IExpense } from "@/interfaces/expenses/IExpense"
import type { IExpenseSummary } from "@/interfaces/expenses/IExpenseSummary"
import type { IStore } from "@/interfaces/stores/IStore"
import { Edit, Loader2, Plus, Receipt, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
    EXPENSE_TYPE_LABELS,
    EXPENSE_TYPE_STYLES,
    MONTH_LABELS,
    formatCLP,
    formatExpenseDate,
    getExpenseMonth,
    getExpenseYear,
} from "./expenses.utils"

type TypeFilter = ExpenseType | "ALL"

interface ExpensesClientProps {
    initialExpenses: IExpense[]
    initialSummary: IExpenseSummary | null
    stores: IStore[]
    initialStoreId: string
    loadError?: string
}

const ALL_STORES = "ALL"
const ALL_YEARS = "ALL"

export default function ExpensesClient({
    initialExpenses,
    initialSummary,
    stores,
    initialStoreId,
    loadError,
}: ExpensesClientProps) {
    const [expenses, setExpenses] = useState(initialExpenses)
    const [summary, setSummary] = useState<IExpenseSummary | null>(initialSummary)
    const [search, setSearch] = useState("")
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL")
    const [storeFilter, setStoreFilter] = useState(initialStoreId || ALL_STORES)
    const [yearFilter, setYearFilter] = useState<string>(ALL_YEARS)
    const [monthFilter, setMonthFilter] = useState("0")
    const [editingExpense, setEditingExpense] = useState<IExpense | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

    useEffect(() => {
        if (initialStoreId) setStoreFilter(initialStoreId)
    }, [initialStoreId])

    const years = useMemo(() => {
        const found = new Set<number>()
        expenses.forEach((expense) => {
            const year = getExpenseYear(expense.deductibleDate)
            if (year > 0) found.add(year)
        })
        return [...found].sort((a, b) => b - a)
    }, [expenses])

    const filteredExpenses = useMemo(() => {
        const query = search.trim().toLowerCase()
        const month = Number(monthFilter)
        return expenses.filter((expense) => {
            if (typeFilter !== "ALL" && expense.type !== typeFilter) return false
            if (storeFilter !== ALL_STORES && expense.storeID !== storeFilter) return false
            if (yearFilter !== ALL_YEARS && getExpenseYear(expense.deductibleDate) !== Number(yearFilter)) return false
            if (month > 0 && getExpenseMonth(expense.deductibleDate) !== month) return false
            if (!query) return true
            return (
                expense.name.toLowerCase().includes(query) ||
                (expense.storeName ?? "").toLowerCase().includes(query) ||
                (expense.supportDocument ?? "").toLowerCase().includes(query) ||
                EXPENSE_TYPE_LABELS[expense.type].toLowerCase().includes(query)
            )
        })
    }, [expenses, search, typeFilter, storeFilter, yearFilter, monthFilter])

    const filteredTotal = useMemo(
        () => filteredExpenses.reduce((total, expense) => total + expense.amount, 0),
        [filteredExpenses],
    )

    const summaryByType = useMemo(() => {
        const map = new Map<ExpenseType, number>()
        summary?.totals.byType.forEach((item) => map.set(item.type, item.total))
        return map
    }, [summary])

    const refreshSummary = async (storeId?: string) => {
        try {
            setSummary(await getExpensesSummary(storeId))
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo cargar el resumen de gastos")
        }
    }

    const refreshExpenses = async () => {
        setIsLoading(true)
        try {
            setExpenses(await getAllExpenses())
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudieron cargar los gastos")
        } finally {
            setIsLoading(false)
        }
    }

    const handleStoreFilterChange = async (value: string) => {
        setStoreFilter(value)
        await refreshSummary(value === ALL_STORES ? undefined : value)
    }

    const openCreateDialog = () => {
        setEditingExpense(null)
        setIsDialogOpen(true)
    }

    const openEditDialog = (expense: IExpense) => {
        setEditingExpense(expense)
        setIsDialogOpen(true)
        setConfirmingDeleteId(null)
    }

    const handleSaved = async (savedExpense: IExpense) => {
        setExpenses((current) => {
            const exists = current.some((expense) => expense.expenseID === savedExpense.expenseID)
            if (exists) {
                return current.map((expense) => (expense.expenseID === savedExpense.expenseID ? savedExpense : expense))
            }
            return [savedExpense, ...current]
        })
        await refreshSummary(storeFilter === ALL_STORES ? undefined : storeFilter)
    }

    const handleDelete = async (expenseID: string) => {
        setIsLoading(true)
        try {
            await deleteExpense(expenseID)
            setExpenses((current) => current.filter((expense) => expense.expenseID !== expenseID))
            toast.success("Gasto eliminado correctamente")
            setConfirmingDeleteId(null)
            await refreshSummary(storeFilter === ALL_STORES ? undefined : storeFilter)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo eliminar el gasto")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-5">
            {loadError && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                    {loadError}
                </div>
            )}

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="border-b border-slate-200 p-5 dark:border-slate-700">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                Finanzas
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-green-600" />
                                <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Egresos</h1>
                            </div>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                                {filteredExpenses.length} de {expenses.length} gastos · Total filtrado{" "}
                                {formatCLP(filteredTotal)}.
                            </p>
                        </div>

                        <Button type="button" onClick={openCreateDialog} className="bg-green-600 text-white hover:bg-green-700">
                            <Plus className="h-4 w-4" />
                            Agregar gasto
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-3 border-b border-slate-200 p-5 dark:border-slate-700 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Buscar por nombre, tienda o documento..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
                        <SelectTrigger className="w-full lg:w-56">
                            <SelectValue placeholder="Categoría" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todas las categorías</SelectItem>
                            <SelectItem value="administrative">Administración</SelectItem>
                            <SelectItem value="operational">Operación</SelectItem>
                            <SelectItem value="financial">Financiero</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={storeFilter} onValueChange={handleStoreFilterChange}>
                        <SelectTrigger className="w-full lg:w-56">
                            <SelectValue placeholder="Tienda" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_STORES}>Todas las tiendas</SelectItem>
                            {stores.map((store) => (
                                <SelectItem key={store.storeID} value={store.storeID}>
                                    {store.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                        <SelectTrigger className="w-full lg:w-36">
                            <SelectValue placeholder="Año" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_YEARS}>Todos los años</SelectItem>
                            {years.map((year) => (
                                <SelectItem key={year} value={String(year)}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                        <SelectTrigger className="w-full lg:w-44">
                            <SelectValue placeholder="Mes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">Todos los meses</SelectItem>
                            {MONTH_LABELS.map((label, index) => (
                                <SelectItem key={label} value={String(index + 1)}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {summary ? (
                    <div className="grid grid-cols-2 gap-3 border-b border-slate-200 p-5 dark:border-slate-700 lg:grid-cols-4">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Total {summary.year}
                            </p>
                            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                                {formatCLP(summary.totals.total)}
                            </p>
                        </div>
                        {(["administrative", "operational", "financial"] as ExpenseType[]).map((type) => (
                            <div
                                key={type}
                                className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"
                            >
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    {EXPENSE_TYPE_LABELS[type]}
                                </p>
                                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                                    {formatCLP(summaryByType.get(type) ?? 0)}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="border-b border-slate-200 px-5 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        No se pudo cargar el resumen del año en curso.
                    </p>
                )}

                {isLoading && expenses.length === 0 ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                        <span className="ml-2 text-slate-500">Cargando gastos...</span>
                    </div>
                ) : filteredExpenses.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">
                        <Receipt className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                        <p>
                            {search || typeFilter !== "ALL" || storeFilter !== ALL_STORES || yearFilter !== ALL_YEARS || monthFilter !== "0"
                                ? "No hay gastos que coincidan con los filtros."
                                : "No hay gastos registrados"}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 dark:bg-slate-700">
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead>Tienda</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead className="text-right">Neto</TableHead>
                                    <TableHead className="text-right">IVA</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredExpenses.map((expense) => (
                                    <TableRow key={expense.expenseID} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                                        <TableCell>
                                            <p className="font-medium text-slate-900 dark:text-white">{expense.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {expense.supportDocument ?? "Sin documento de respaldo"}
                                                {!expense.acceptedForTax && " · No deducible"}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={EXPENSE_TYPE_STYLES[expense.type]}>
                                                {EXPENSE_TYPE_LABELS[expense.type]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{expense.storeName ?? "—"}</TableCell>
                                        <TableCell>{formatExpenseDate(expense.deductibleDate)}</TableCell>
                                        <TableCell className="text-right">{formatCLP(expense.netAmount)}</TableCell>
                                        <TableCell className="text-right">{formatCLP(expense.taxAmount)}</TableCell>
                                        <TableCell className="text-right font-semibold text-green-600">
                                            {formatCLP(expense.amount)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditDialog(expense)}
                                                    aria-label={`Editar ${expense.name}`}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                {confirmingDeleteId === expense.expenseID ? (
                                                    <div className="flex gap-1">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={() => handleDelete(expense.expenseID)}
                                                            disabled={isLoading}
                                                            className="bg-red-600 text-white hover:bg-red-700"
                                                        >
                                                            Confirmar
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setConfirmingDeleteId(null)}
                                                        >
                                                            Cancelar
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setConfirmingDeleteId(expense.expenseID)}
                                                        aria-label={`Eliminar ${expense.name}`}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </section>

            <ExpenseDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                expense={editingExpense}
                stores={stores}
                defaultStoreID={storeFilter !== ALL_STORES ? storeFilter : initialStoreId}
                onSaved={handleSaved}
            />
        </div>
    )
}
