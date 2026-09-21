"use client"

import { FormEvent, useEffect, useState } from "react"
import { createCashRegister, updateCashRegister } from "@/actions/cash-registers/cashRegisters"
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
import type { CashRegisterStatus, ICashRegister } from "@/interfaces/cash-registers/ICashRegister"
import { toast } from "sonner"

type CashRegisterFormDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    storeID: string
    register: ICashRegister | null
    onSaved: () => Promise<void> | void
}

export default function CashRegisterFormDialog({
    open,
    onOpenChange,
    storeID,
    register,
    onSaved,
}: CashRegisterFormDialogProps) {
    const [code, setCode] = useState("")
    const [name, setName] = useState("")
    const [status, setStatus] = useState<CashRegisterStatus>("ACTIVE")
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (!open) return
        setCode(register?.code ?? "")
        setName(register?.name ?? "")
        setStatus(register?.status ?? "ACTIVE")
    }, [open, register])

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!code.trim() || !name.trim()) {
            toast.error("El código y el nombre son obligatorios")
            return
        }

        setIsSubmitting(true)
        try {
            if (register) {
                await updateCashRegister(register.cashRegisterID, { code: code.trim(), name: name.trim(), status })
                toast.success("Caja actualizada")
            } else {
                await createCashRegister({ storeID, code: code.trim(), name: name.trim(), status })
                toast.success("Caja creada")
            }
            await onSaved()
            onOpenChange(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar la caja")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
                        <DialogTitle>{register ? "Editar caja" : "Nueva caja"}</DialogTitle>
                        <DialogDescription>
                            {register ? "Actualiza la configuración permanente de esta caja." : "Registra una caja física o virtual en la tienda seleccionada."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 px-6 py-5">
                        <div>
                            <Label htmlFor="cash-register-code" className="mb-2 block">Código</Label>
                            <Input id="cash-register-code" value={code} onChange={(event) => setCode(event.target.value)} maxLength={50} placeholder="CAJA-01" required />
                        </div>
                        <div>
                            <Label htmlFor="cash-register-name" className="mb-2 block">Nombre</Label>
                            <Input id="cash-register-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="Caja principal" required />
                        </div>
                        <div>
                            <Label className="mb-2 block">Estado</Label>
                            <Select value={status} onValueChange={(value) => setStatus(value as CashRegisterStatus)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ACTIVE">Activa</SelectItem>
                                    <SelectItem value="INACTIVE">Inactiva</SelectItem>
                                    <SelectItem value="MAINTENANCE">En mantenimiento</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
                        <Button type="submit" className="bg-slate-700 text-white hover:bg-slate-800" disabled={isSubmitting}>
                            {isSubmitting ? "Guardando..." : register ? "Guardar cambios" : "Crear caja"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
