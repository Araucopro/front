"use client"

import { useMemo, useState } from "react"
import { createClient } from "@/actions/clients/createClient"
import { deleteClient } from "@/actions/clients/deleteClient"
import { getClients } from "@/actions/clients/getClients"
import { updateClient } from "@/actions/clients/updateClient"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { ClientSegment, IClient, IClientPayload, IClientsResponse } from "@/interfaces/clients/IClient"
import { Building2, Edit, Plus, Search, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

type SegmentFilter = ClientSegment | "ALL"

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

interface ClientsClientProps {
    initialData: IClientsResponse
    loadError?: string
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

const segmentLabels: Record<ClientSegment, string> = {
    RETAIL: "Retail",
    WHOLESALE: "Mayorista",
}

const segmentStyles: Record<ClientSegment, string> = {
    RETAIL: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200",
    WHOLESALE:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
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

const buildCreatePayload = (form: ClientFormState): IClientPayload => ({
    rut: form.rut.trim(),
    name: form.name.trim(),
    giro: form.giro.trim() || undefined,
    address: form.address.trim() || undefined,
    city: form.city.trim() || undefined,
    email: form.email.trim() || undefined,
    phone: form.phone.trim() || undefined,
    segment: form.segment,
    notes: form.notes.trim() || undefined,
})

const buildUpdatePayload = (form: ClientFormState): IClientPayload => ({
    rut: form.rut.trim(),
    name: form.name.trim(),
    giro: form.giro.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    segment: form.segment,
    notes: form.notes.trim(),
})

export default function ClientsClient({ initialData, loadError }: ClientsClientProps) {
    const [clients, setClients] = useState(initialData.clients)
    const [meta, setMeta] = useState(initialData.meta)
    const [search, setSearch] = useState("")
    const [segment, setSegment] = useState<SegmentFilter>("ALL")
    const [page, setPage] = useState(initialData.meta.page || 1)
    const [form, setForm] = useState<ClientFormState>(emptyForm)
    const [editingClient, setEditingClient] = useState<IClient | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

    const totalPages = useMemo(() => Math.max(1, Math.ceil(meta.total / meta.limit)), [meta.limit, meta.total])

    const refreshClients = async (nextPage = page) => {
        setIsLoading(true)
        try {
            const response = await getClients({
                page: nextPage,
                limit: meta.limit || 50,
                search,
                segment: segment === "ALL" ? undefined : segment,
            })
            setClients(response.clients)
            setMeta(response.meta)
            setPage(response.meta.page)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudieron cargar los clientes")
        } finally {
            setIsLoading(false)
        }
    }

    const openCreateDialog = () => {
        setEditingClient(null)
        setForm(emptyForm)
        setIsDialogOpen(true)
    }

    const openEditDialog = (client: IClient) => {
        setEditingClient(client)
        setForm(toFormState(client))
        setIsDialogOpen(true)
        setConfirmingDeleteId(null)
    }

    const updateField = (field: keyof ClientFormState, value: string) => {
        setForm((current) => ({ ...current, [field]: value }))
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!form.rut.trim() || !form.name.trim()) {
            toast.error("RUT y razón social son obligatorios")
            return
        }

        setIsLoading(true)
        try {
            if (editingClient) {
                await updateClient(editingClient.clientID, buildUpdatePayload(form))
                toast.success("Cliente actualizado correctamente")
            } else {
                await createClient(buildCreatePayload(form))
                toast.success("Cliente creado correctamente")
            }

            setIsDialogOpen(false)
            await refreshClients(editingClient ? page : 1)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar el cliente")
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (clientID: string) => {
        setIsLoading(true)
        try {
            await deleteClient(clientID)
            toast.success("Cliente eliminado correctamente")
            setConfirmingDeleteId(null)
            await refreshClients(clients.length === 1 && page > 1 ? page - 1 : page)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo eliminar el cliente")
        } finally {
            setIsLoading(false)
        }
    }

    const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        await refreshClients(1)
    }

    const handleSegmentChange = async (value: SegmentFilter) => {
        setSegment(value)
        setIsLoading(true)
        try {
            const response = await getClients({
                page: 1,
                limit: meta.limit || 50,
                search,
                segment: value === "ALL" ? undefined : value,
            })
            setClients(response.clients)
            setMeta(response.meta)
            setPage(response.meta.page)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudieron filtrar los clientes")
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
                                Comercial
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-600" />
                                <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Clientes</h1>
                            </div>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                                {meta.total} registros · Gestiona clientes retail y mayoristas.
                            </p>
                        </div>

                        <Button
                            type="button"
                            onClick={openCreateDialog}
                            className="bg-blue-600 text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            Agregar cliente
                        </Button>
                    </div>

                    <form onSubmit={handleSearch} className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_auto]">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Buscar por nombre o RUT..."
                                className="pl-9"
                            />
                        </div>
                        <Select value={segment} onValueChange={(value) => handleSegmentChange(value as SegmentFilter)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos los segmentos</SelectItem>
                                <SelectItem value="RETAIL">Retail</SelectItem>
                                <SelectItem value="WHOLESALE">Mayorista</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button type="submit" variant="outline" disabled={isLoading}>
                            Buscar
                        </Button>
                    </form>
                </div>

                <div className="p-5">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 dark:bg-slate-900">
                                <TableHead>Tipo</TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>Razón social</TableHead>
                                <TableHead>RUT</TableHead>
                                <TableHead>Dirección</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Teléfono</TableHead>
                                <TableHead className="w-[150px] text-right">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-300">
                                        <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                                        No hay clientes registrados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                clients.map((client) => (
                                    <TableRow key={client.clientID}>
                                        <TableCell>
                                            <Badge variant="outline" className={segmentStyles[client.segment]}>
                                                {segmentLabels[client.segment]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-[180px] break-all font-mono text-xs text-slate-500 dark:text-slate-300">
                                            {client.clientID}
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-950 dark:text-white">
                                            {client.name}
                                            {client.giro && (
                                                <p className="mt-1 text-xs font-normal text-slate-500 dark:text-slate-300">
                                                    {client.giro}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>{client.rut}</TableCell>
                                        <TableCell>
                                            {[client.address, client.city].filter(Boolean).join(", ") || "Sin dirección"}
                                        </TableCell>
                                        <TableCell className="text-blue-600">{client.email || "Sin email"}</TableCell>
                                        <TableCell>{client.phone || "Sin teléfono"}</TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-2">
                                                {confirmingDeleteId === client.clientID ? (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleDelete(client.clientID)}
                                                            disabled={isLoading}
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
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="outline"
                                                            title="Editar cliente"
                                                            onClick={() => openEditDialog(client)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="outline"
                                                            title="Eliminar cliente"
                                                            onClick={() => setConfirmingDeleteId(client.clientID)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-600" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                            Página {page} de {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={page <= 1 || isLoading}
                                onClick={() => refreshClients(page - 1)}
                            >
                                Anterior
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={page >= totalPages || isLoading}
                                onClick={() => refreshClients(page + 1)}
                            >
                                Siguiente
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
                        <DialogTitle>{editingClient ? "Editar cliente" : "Agregar cliente"}</DialogTitle>
                        <DialogDescription>
                            Completa los datos comerciales del cliente. RUT y razón social son obligatorios.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="max-h-[72vh] overflow-y-auto px-6 py-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <Label htmlFor="client-rut">RUT *</Label>
                                <Input
                                    id="client-rut"
                                    value={form.rut}
                                    onChange={(event) => updateField("rut", event.target.value)}
                                    placeholder="76234556-6"
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
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading} className="bg-blue-600 text-white hover:bg-blue-700">
                                {isLoading ? "Guardando..." : "Guardar cliente"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
