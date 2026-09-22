"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import ModalGestion from "./ModalGestion"
import { Receipt, Calendar, DollarSign, Save, X, Tag } from "lucide-react"
import { createExpense } from "@/actions/expenses/createExpense"
import { IExpense, ExpenseType } from "@/interfaces/expenses/IExpense"
import { useTienda } from "@/stores/tienda.store"

interface GestionGastosFormProps {
    isOpen: boolean
    onClose: () => void
    onSave: (gasto: IExpense) => void
}

// Mapeo: label visible ↔ valor que espera la API
const CATEGORIAS: { value: ExpenseType; label: string }[] = [
    { value: "operational", label: "Gastos de operación" },
    { value: "sales", label: "Gastos de ventas" },
    { value: "administrative", label: "Gastos de administración" },
]

export default function GestionGastosForm({ isOpen, onClose, onSave }: GestionGastosFormProps) {
    const { storeSelected } = useTienda()
    const [nombre, setNombre] = useState("")
    const [categoria, setCategoria] = useState<ExpenseType | "">("")
    const [monto, setMonto] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [fechaFactura, setFechaFactura] = useState(new Date().toISOString().split("T")[0])
    const [isEditingFecha, setIsEditingFecha] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            if (!nombre.trim()) {
                toast.error("El nombre del gasto es obligatorio")
                return
            }
            if (!categoria) {
                toast.error("Debes seleccionar una categoría")
                return
            }
            if (!monto || parseFloat(monto) <= 0) {
                toast.error("El monto debe ser mayor a 0")
                return
            }
            if (!storeSelected?.storeID) {
                toast.error("No hay tienda seleccionada")
                return
            }

            const nuevoGasto = await createExpense({
                name: nombre.trim(),
                deductibleDate: new Date(fechaFactura).toISOString(),
                amount: parseFloat(monto),
                type: categoria as ExpenseType,
                storeID: storeSelected.storeID,
            })

            onSave(nuevoGasto)
            toast.success("Gasto agregado exitosamente")

            setNombre("")
            setCategoria("")
            setMonto("")
            setFechaFactura(new Date().toISOString().split("T")[0])
        } catch (error) {
            toast.error("Error al agregar gasto")
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleClose = () => {
        setNombre("")
        setCategoria("")
        setMonto("")
        onClose()
    }

    const validateForm = () => nombre.trim() !== "" && categoria !== "" && monto !== "" && parseFloat(monto) > 0

    const formatearFecha = (fecha: string) =>
        new Date(fecha).toLocaleDateString("es-CL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        })

    const getLabelCategoria = (val: string) => CATEGORIAS.find((c) => c.value === val)?.label ?? val

    return (
        <ModalGestion isOpen={isOpen} onClose={handleClose} title="Agregar Nuevo Gasto" maxWidth="max-w-2xl">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-lg font-medium dark:text-white text-gray-700">
                        <Receipt className="w-5 h-5" />
                        <span>Información del Gasto</span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {/* Nombre */}
                        <div>
                            <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                                <Receipt className="w-4 h-4" />
                                Nombre del Gasto *
                            </Label>
                            <Input
                                id="nombre"
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="Ej: Servicios Básicos - Electricidad"
                                required
                                className="bg-slate-100 dark:border-sky-50 dark:bg-slate-800"
                            />
                        </div>

                        {/* Categoría */}
                        <div>
                            <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                                <Tag className="w-4 h-4" />
                                Categoría *
                            </Label>
                            <Select value={categoria} onValueChange={(v) => setCategoria(v as ExpenseType)}>
                                <SelectTrigger className="bg-slate-100 dark:border-sky-50 dark:bg-slate-800">
                                    <SelectValue placeholder="Selecciona una categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIAS.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-1">
                                Clasifica el gasto según su función en la empresa
                            </p>
                        </div>

                        {/* Fecha de factura */}
                        <div>
                            <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Fecha de Factura
                            </Label>
                            {isEditingFecha ? (
                                <Input
                                    type="date"
                                    value={fechaFactura}
                                    onChange={(e) => setFechaFactura(e.target.value)}
                                    onBlur={() => setIsEditingFecha(false)}
                                    className="bg-slate-100 dark:bg-slate-800"
                                    autoFocus
                                />
                            ) : (
                                <div
                                    onClick={() => setIsEditingFecha(true)}
                                    className="bg-gray-100 dark:bg-slate-700 text-gray-500 px-3 py-2 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600"
                                >
                                    {formatearFecha(fechaFactura)}
                                </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1">Fecha automática, haz clic para modificar.</p>
                        </div>

                        {/* Monto */}
                        <div>
                            <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                Monto *
                            </Label>
                            <CurrencyInput
                                id="monto"
                                value={monto}
                                onValueChange={setMonto}
                                placeholder="$ 0"
                                allowDecimals
                                required
                                className="bg-slate-100 dark:border-sky-50 dark:bg-slate-800"
                            />
                            <p className="text-xs text-gray-500 mt-1">Ingresa el monto en pesos chilenos (CLP)</p>
                        </div>
                    </div>
                </div>

                {/* Vista previa */}
                {nombre && categoria && monto && (
                    <div className="bg-blue-50 dark:bg-slate-700 p-4 rounded-lg border border-blue-200 dark:border-slate-600">
                        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                            Vista Previa del Gasto:
                        </h4>
                        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                            <p>
                                <span className="font-medium">Nombre:</span> {nombre}
                            </p>
                            <p>
                                <span className="font-medium">Categoría:</span> {getLabelCategoria(categoria)}
                            </p>
                            <p>
                                <span className="font-medium">Fecha Factura:</span> {formatearFecha(fechaFactura)}
                            </p>
                            <p>
                                <span className="font-medium">Monto:</span>{" "}
                                {new Intl.NumberFormat("es-CL", {
                                    style: "currency",
                                    currency: "CLP",
                                }).format(parseFloat(monto))}
                            </p>
                        </div>
                    </div>
                )}

                {/* Botones */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                        type="button"
                        onClick={handleClose}
                        disabled={isLoading}
                        className="bg-gray-200 dark:bg-slate-700 dark:hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        <X className="w-4 h-4" />
                        <span>Cancelar</span>
                    </Button>
                    <Button
                        type="submit"
                        disabled={!validateForm() || isLoading}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        <Save className="w-4 h-4" />
                        <span>{isLoading ? "Agregando..." : "Agregar Gasto"}</span>
                    </Button>
                </div>
            </form>
        </ModalGestion>
    )
}
