"use client"

import { FormEvent, useEffect, useState } from "react"
import { cancelStoreClosure, createStoreClosure } from "@/actions/human-resources/attendance"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { IStoreClosure } from "@/interfaces/human-resources/IHumanResources"
import { toast } from "sonner"

type StoreClosureDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    storeID: string
    date: string
    closure: IStoreClosure | null
    onSaved: () => Promise<void> | void
}

export default function StoreClosureDialog({ open, onOpenChange, storeID, date, closure, onSaved }: StoreClosureDialogProps) {
    const [reason, setReason] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (open) setReason(closure ? "La tienda operará excepcionalmente" : "")
    }, [closure, open])

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!reason.trim()) {
            toast.error("Ingresa un motivo")
            return
        }
        setIsSubmitting(true)
        try {
            if (closure) {
                await cancelStoreClosure(storeID, closure.id, reason.trim())
                toast.success("Cierre cancelado; la tienda vuelve a operar ese día")
            } else {
                await createStoreClosure(storeID, { startDate: date, endDate: date, reason: reason.trim() })
                toast.success("Día marcado como cerrado")
            }
            await onSaved()
            onOpenChange(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo actualizar el cierre")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
                        <DialogTitle>{closure ? "Reabrir tienda" : "Cerrar tienda"}</DialogTitle>
                        <DialogDescription>
                            {closure
                                ? `Cancela el cierre activo del ${closure.startDate} al ${closure.endDate}.`
                                : `Registra un día no operativo para el ${date}.`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5">
                        <Label htmlFor="closure-reason" className="mb-2 block">Motivo</Label>
                        <Textarea
                            id="closure-reason"
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            maxLength={500}
                            placeholder={closure ? "Motivo de la reapertura" : "Ej: feriado o cierre administrativo"}
                            required
                        />
                    </div>
                    <DialogFooter className="border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
                        <Button type="submit" className="bg-slate-700 text-white hover:bg-slate-800" disabled={isSubmitting}>
                            {isSubmitting ? "Guardando..." : closure ? "Reabrir tienda" : "Cerrar tienda"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
