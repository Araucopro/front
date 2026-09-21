"use client"

import { FormEvent, useEffect, useState } from "react"
import {
    createAttendanceOverride,
    deleteAttendanceOverride,
    updateAttendanceOverride,
} from "@/actions/human-resources/attendance"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type {
    AttendanceOverrideType,
    ICalendarEmployee,
} from "@/interfaces/human-resources/IHumanResources"
import { toast } from "sonner"

const absenceTypes: Array<{ value: AttendanceOverrideType; label: string }> = [
    { value: "VACATION", label: "Vacaciones" },
    { value: "MEDICAL_LEAVE", label: "Licencia médica" },
    { value: "PERMIT", label: "Permiso" },
    { value: "JUSTIFIED_ABSENCE", label: "Ausencia justificada" },
    { value: "UNJUSTIFIED_ABSENCE", label: "Ausencia injustificada" },
]

type AttendanceOverrideDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    storeID: string
    employee: ICalendarEmployee | null
    employees?: ICalendarEmployee[]
    date: string
    storeIsClosed: boolean
    onSaved: () => Promise<void> | void
}

export default function AttendanceOverrideDialog({
    open,
    onOpenChange,
    storeID,
    employee,
    employees = [],
    date,
    storeIsClosed,
    onSaved,
}: AttendanceOverrideDialogProps) {
    const [startDate, setStartDate] = useState(date)
    const [endDate, setEndDate] = useState(date)
    const [type, setType] = useState<AttendanceOverrideType>("VACATION")
    const [reason, setReason] = useState("")
    const [selectedEmployeeID, setSelectedEmployeeID] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const activeEmployee = employee ?? employees.find((item) => item.employeeID === selectedEmployeeID) ?? null
    const isEditing = Boolean(activeEmployee?.overrideID)

    useEffect(() => {
        if (!open) return
        setStartDate(date)
        setEndDate(date)
        setSelectedEmployeeID(employee?.employeeID ?? employees[0]?.employeeID ?? "")
        setType(
            employee?.status !== "PRESENT" && employee?.status !== "CLOSED"
                ? employee?.status ?? "VACATION"
                : "VACATION",
        )
        setReason(employee?.reason ?? "")
    }, [date, employee, employees, open])

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!activeEmployee) {
            toast.error("Selecciona un trabajador")
            return
        }
        if (!reason.trim()) {
            toast.error("Ingresa el motivo del registro")
            return
        }
        if (endDate < startDate) {
            toast.error("La fecha final no puede ser anterior a la inicial")
            return
        }

        setIsSubmitting(true)
        try {
            const payload = { startDate, endDate, type, reason: reason.trim() }
            if (activeEmployee.overrideID) {
                await updateAttendanceOverride(storeID, activeEmployee.overrideID, payload)
                toast.success("Asistencia actualizada")
            } else {
                await createAttendanceOverride(storeID, { employeeID: activeEmployee.employeeID, ...payload })
                toast.success("Ausencia registrada")
            }
            await onSaved()
            onOpenChange(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar la asistencia")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRestorePresence = async () => {
        if (!activeEmployee?.overrideID) return
        setIsSubmitting(true)
        try {
            await deleteAttendanceOverride(storeID, activeEmployee.overrideID)
            toast.success("Se restauró la presencia por defecto")
            await onSaved()
            onOpenChange(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo restaurar la presencia")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
                        <DialogTitle>{isEditing ? "Editar asistencia" : "Registrar ausencia"}</DialogTitle>
                        <DialogDescription>
                            {activeEmployee?.name ?? "Selecciona un trabajador"}. Todos los trabajadores están presentes por defecto; solo registra una excepción.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 px-6 py-5">
                        {!employee && (
                            <div>
                                <Label className="mb-2 block">Trabajador</Label>
                                <Select value={selectedEmployeeID} onValueChange={setSelectedEmployeeID}>
                                    <SelectTrigger><SelectValue placeholder="Selecciona un trabajador" /></SelectTrigger>
                                    <SelectContent>
                                        {employees.map((item) => (
                                            <SelectItem key={item.employeeID} value={item.employeeID}>{item.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="attendance-start" className="mb-2 block">Desde</Label>
                                <Input id="attendance-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
                            </div>
                            <div>
                                <Label htmlFor="attendance-end" className="mb-2 block">Hasta</Label>
                                <Input id="attendance-end" type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} required />
                            </div>
                        </div>

                        <div>
                            <Label className="mb-2 block">Estado</Label>
                            <Select value={type} onValueChange={(value) => setType(value as AttendanceOverrideType)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {absenceTypes.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                    {storeIsClosed && (
                                        <SelectItem value="PRESENT_ON_CLOSED_DAY">Presente en día cerrado</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="attendance-reason" className="mb-2 block">Motivo</Label>
                            <Textarea
                                id="attendance-reason"
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                maxLength={1000}
                                placeholder="Describe el motivo administrativo"
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter className="border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                        {isEditing && (
                            <Button type="button" variant="outline" onClick={handleRestorePresence} disabled={isSubmitting} className="sm:mr-auto">
                                Restaurar presencia
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
                        <Button type="submit" className="bg-slate-700 text-white hover:bg-slate-800" disabled={isSubmitting || !activeEmployee}>
                            {isSubmitting ? "Guardando..." : "Guardar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
