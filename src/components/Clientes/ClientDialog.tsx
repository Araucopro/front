"use client"

import { useState, type FormEvent } from "react"
import { createClient } from "@/actions/clients/createClient"
import { updateClient } from "@/actions/clients/updateClient"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RutInput } from "@/components/ui/rut-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ClientSegment, IClient, IClientPayload } from "@/interfaces/clients/IClient"
import { normalizeRutValue } from "@/utils/rut"
import { toast } from "sonner"

type ClientFormState = {
    rut: string
    name: string
    giro: string
    address: string
    city: string
    email: string
    phone: string
    segment: ClientSegment
    notes: string
}

type ClientDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    client?: IClient | null
    onSaved: (client: IClient) => void | Promise<void>
}

const emptyForm: ClientFormState = {
    rut: "",
    name: "",
    giro: "",
    address: "",
    city: "",
    email: "",
    phone: "",
    segment: "RETAIL",
    notes: "",
}

const toFormState = (client: IClient): ClientFormState => ({
    rut: client.rut,
    name: client.name,
    giro: client.giro ?? "",
    address: client.address ?? "",
    city: client.city ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    segment: client.segment,
    notes: client.notes ?? "",
})

const buildPayload = (form: ClientFormState, editing: boolean): IClientPayload => ({
    rut: normalizeRutValue(form.rut),
    name: form.name.trim(),
    giro: form.giro.trim() || (editing ? "" : undefined),
    address: form.address.trim() || (editing ? "" : undefined),
    city: form.city.trim() || (editing ? "" : undefined),
    email: form.email.trim() || (editing ? "" : undefined),
    phone: form.phone.trim() || (editing ? "" : undefined),
    segment: form.segment,
    notes: form.notes.trim() || (editing ? "" : undefined),
})

export default function ClientDialog({ open, onOpenChange, client, onSaved }: ClientDialogProps) {
    const [form, setForm] = useState<ClientFormState>(() => (client ? toFormState(client) : { ...emptyForm }))
    const [isSaving, setIsSaving] = useState(false)

    const updateField = (field: keyof ClientFormState, value: string) => {
        setForm((current) => ({ ...current, [field]: value }))
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!form.rut.trim() || !form.name.trim()) {
            toast.error("RUT y razón social son obligatorios")
            return
        }

        setIsSaving(true)
        try {
            const payload = buildPayload(form, Boolean(client))
            const savedClient = client
                ? await updateClient(client.clientID, payload)
                : await createClient(payload)
            toast.success(client ? "Cliente actualizado correctamente" : "Cliente creado correctamente")
            onOpenChange(false)
            try {
                await onSaved(savedClient)
            } catch {
                toast.warning("El cliente se guardó, pero no se pudo actualizar la vista")
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar el cliente")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
            <DialogContent className="max-w-4xl">
                <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
                    <DialogTitle>{client ? "Editar cliente" : "Agregar cliente"}</DialogTitle>
                    <DialogDescription>
                        Completa los datos comerciales del cliente. RUT y razón social son obligatorios.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="max-h-[72vh] overflow-y-auto px-6 py-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <Label htmlFor="client-rut">RUT *</Label>
                            <RutInput
                                id="client-rut"
                                value={form.rut}
                                onValueChange={(rut) => updateField("rut", rut)}
                                placeholder="76.234.556-6"
                                required
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="client-segment">Tipo *</Label>
                            <Select
                                value={form.segment}
                                onValueChange={(value) => updateField("segment", value as ClientSegment)}
                            >
                                <SelectTrigger id="client-segment" className="mt-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="RETAIL">Retail</SelectItem>
                                    <SelectItem value="WHOLESALE">Mayorista</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="client-name">Razón social *</Label>
                            <Input
                                id="client-name"
                                value={form.name}
                                onChange={(event) => updateField("name", event.target.value)}
                                placeholder="Comercial Ejemplo SpA"
                                required
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="client-giro">Giro</Label>
                            <Input
                                id="client-giro"
                                value={form.giro}
                                onChange={(event) => updateField("giro", event.target.value)}
                                placeholder="Venta al por menor"
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="client-email">Email</Label>
                            <Input
                                id="client-email"
                                type="email"
                                value={form.email}
                                onChange={(event) => updateField("email", event.target.value)}
                                placeholder="contacto@empresa.cl"
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="client-address">Dirección</Label>
                            <Input
                                id="client-address"
                                value={form.address}
                                onChange={(event) => updateField("address", event.target.value)}
                                placeholder="Av. Providencia 1234"
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="client-city">Comuna o ciudad</Label>
                            <Input
                                id="client-city"
                                value={form.city}
                                onChange={(event) => updateField("city", event.target.value)}
                                placeholder="Providencia"
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="client-phone">Teléfono</Label>
                            <Input
                                id="client-phone"
                                value={form.phone}
                                onChange={(event) => updateField("phone", event.target.value)}
                                placeholder="+56912345678"
                                className="mt-2"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="client-notes">Notas</Label>
                            <Textarea
                                id="client-notes"
                                value={form.notes}
                                onChange={(event) => updateField("notes", event.target.value)}
                                placeholder="Comentarios comerciales o condiciones relevantes"
                                className="mt-2"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSaving} className="bg-blue-600 text-white hover:bg-blue-700">
                            {isSaving ? "Guardando..." : "Guardar cliente"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
