"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Trash2, Receipt, Loader2 } from "lucide-react"
import GestionGastosForm from "../Edit/GestionGastosForm"
import { useRouter } from "next/navigation"
import { getAllExpenses } from "@/actions/expenses/getAllExpenses"
import { deleteExpense } from "@/actions/expenses/deleteExpense"
import { IExpense, ExpenseType } from "@/interfaces/expenses/IExpense"
import { toast } from "sonner"

// Mapeo tipo API → etiqueta en español
const TIPO_LABEL: Record<ExpenseType, string> = {
    operational: "Gastos de operación",
    financial: "Gastos financieros",
    administrative: "Gastos de administración",
}

const getCategoriaColor = (type: ExpenseType) => {
    switch (type) {
        case "operational":
            return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        case "financial":
            return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
        case "administrative":
            return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
    }
}

export default function GastosTable() {
    const [gastos, setGastos] = useState<IExpense[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [confirmingId, setConfirmingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const router = useRouter()

    // Cargar gastos del backend al montar
    useEffect(() => {
        const fetchGastos = async () => {
            try {
                const data = await getAllExpenses()
                setGastos(data)
            } catch (error) {
                console.error(error)
                toast.error("Error al cargar los gastos")
            } finally {
                setIsLoading(false)
            }
        }
        fetchGastos()
    }, [])

    const gastosFiltrados = gastos.filter(
        (gasto) =>
            gasto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            TIPO_LABEL[gasto.type]?.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    // Llamado después de crear un gasto desde el formulario
    const handleAgregarGasto = (nuevoGasto: IExpense) => {
        setGastos((prev) => [nuevoGasto, ...prev])
        setIsModalOpen(false)
    }

    const handleEliminarGasto = async (gastoId: string) => {
        setDeletingId(gastoId)
        try {
            await deleteExpense(gastoId)
            setGastos((prev) => prev.filter((g) => g.expenseID !== gastoId))
            toast.success("Gasto eliminado correctamente")
        } catch (error) {
            console.error(error)
            toast.error("Error al eliminar el gasto")
        } finally {
            setDeletingId(null)
            setConfirmingId(null)
        }
    }

    const formatearMonto = (monto: number) =>
        new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(monto)

    const formatearFecha = (fecha: string) =>
        new Date(fecha).toLocaleDateString("es-CL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "UTC",
        })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-500">Cargando gastos...</span>
            </div>
        )
    }

    return (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
                {/* Botón estado de resultados */}
                <div className="flex justify-end p-4">
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
                        onClick={() => router.push("/home/incomeStatement")}
                    >
                        <span>Ir al estado de resultados</span>
                    </Button>
                </div>

                {/* Header con búsqueda y botón agregar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            type="text"
                            placeholder="Buscar gastos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-100 dark:bg-slate-700"
                        />
                    </div>
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Agregar Gasto</span>
                    </Button>
                </div>

                {/* Estado vacío */}
                {gastosFiltrados.length === 0 ? (
                    <div className="text-center text-gray-500 py-12">
                        <Receipt className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <p>
                            {searchTerm
                                ? `No se encontraron gastos con el término: "${searchTerm}"`
                                : "No hay gastos registrados"}
                        </p>
                        {searchTerm && (
                            <Button
                                onClick={() => setSearchTerm("")}
                                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Mostrar todos los gastos
                            </Button>
                        )}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-slate-700">
                                <TableHead className="uppercase text-gray-500 font-medium tracking-wider">
                                    Nombre
                                </TableHead>
                                <TableHead className="uppercase text-gray-500 font-medium tracking-wider">
                                    Categoría
                                </TableHead>
                                <TableHead className="uppercase text-gray-500 font-medium tracking-wider">
                                    Fecha Factura
                                </TableHead>
                                <TableHead className="uppercase text-gray-500 font-medium tracking-wider">
                                    Monto
                                </TableHead>
                                <TableHead className="uppercase text-gray-500 font-medium tracking-wider">
                                    Acción
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {gastosFiltrados.map((gasto, idx) => (
                                <TableRow
                                    key={gasto.expenseID ?? `gasto-${idx}`}
                                    className="hover:bg-gray-50 dark:hover:bg-slate-700"
                                >
                                    <TableCell className="font-medium text-gray-900 dark:text-white">
                                        {gasto.name}
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoriaColor(gasto.type)}`}
                                        >
                                            {TIPO_LABEL[gasto.type] ?? gasto.type}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-gray-600 dark:text-white">
                                        {formatearFecha(gasto.deductibleDate)}
                                    </TableCell>
                                    <TableCell className="text-green-600 font-semibold">
                                        {formatearMonto(gasto.amount)}
                                    </TableCell>
                                    <TableCell>
                                        {confirmingId === gasto.expenseID ? (
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => handleEliminarGasto(gasto.expenseID)}
                                                    disabled={deletingId === gasto.expenseID}
                                                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs rounded"
                                                >
                                                    {deletingId === gasto.expenseID ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        "Confirmar"
                                                    )}
                                                </Button>
                                                <Button
                                                    onClick={() => setConfirmingId(null)}
                                                    className="bg-gray-200 text-gray-800 px-3 py-1 text-xs rounded hover:bg-gray-300"
                                                >
                                                    Cancelar
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                onClick={() => setConfirmingId(gasto.expenseID)}
                                                variant="destructive"
                                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs rounded flex items-center space-x-1"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                <span>Eliminar</span>
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Modal de creación */}
            {isModalOpen && (
                <GestionGastosForm
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleAgregarGasto}
                />
            )}
        </>
    )
}
