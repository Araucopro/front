"use client"

import { useEffect, useRef, useState } from "react"
import { getClients } from "@/actions/clients/getClients"
import ClientDialog from "@/components/Clientes/ClientDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { IClient } from "@/interfaces/clients/IClient"
import { cn } from "@/lib/utils"
import { Check, Loader2, Plus, Search, UserRound, X } from "lucide-react"

type SaleClientSelectorProps = {
    required: boolean
    selectedClient: IClient | null
    onSelect: (client: IClient | null) => void
}

export function SaleClientSelector({ required, selectedClient, onSelect }: SaleClientSelectorProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [query, setQuery] = useState("")
    const [clients, setClients] = useState<IClient[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
        }
        document.addEventListener("mousedown", handlePointerDown)
        return () => document.removeEventListener("mousedown", handlePointerDown)
    }, [])

    useEffect(() => {
        if (selectedClient) return

        let cancelled = false
        const timeoutID = window.setTimeout(async () => {
            setIsLoading(true)
            setError(null)
            try {
                const response = await getClients({ page: 1, limit: 20, search: query.trim() || undefined })
                if (!cancelled) setClients(response.clients)
            } catch (requestError) {
                if (!cancelled) {
                    setClients([])
                    setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar los clientes")
                }
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }, query.trim() ? 300 : 0)

        return () => {
            cancelled = true
            window.clearTimeout(timeoutID)
        }
    }, [query, selectedClient])

    const selectClient = (client: IClient) => {
        onSelect(client)
        setQuery("")
        setIsOpen(false)
    }

    return (
        <section
            className={cn(
                "rounded-lg border p-4",
                required
                    ? "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20"
                    : "border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40",
            )}
        >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                    <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-blue-600" />
                        <h3 className="font-semibold text-slate-900 dark:text-white">Cliente de la venta</h3>
                        <span
                            className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase",
                                required
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                                    : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200",
                            )}
                        >
                            {required ? "Obligatorio" : "Opcional"}
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                        Busca por nombre, RUT o correo y selecciona un cliente registrado.
                    </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Agregar cliente
                </Button>
            </div>

            {selectedClient ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-white px-3 py-3 dark:border-emerald-900 dark:bg-slate-900">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            <Check className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {selectedClient.name}
                            </p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-300">
                                {selectedClient.rut}
                                {selectedClient.email ? ` · ${selectedClient.email}` : ""}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => onSelect(null)}
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                        aria-label="Quitar cliente"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ) : (
                <div ref={containerRef} className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value)
                            setIsOpen(true)
                        }}
                        onFocus={() => setIsOpen(true)}
                        placeholder="Buscar cliente..."
                        className="bg-white pl-9 dark:bg-slate-950"
                        aria-label="Buscar cliente registrado"
                    />

                    {isOpen && (
                        <div className="absolute z-40 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2 px-4 py-5 text-sm text-slate-500">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Buscando clientes...
                                </div>
                            ) : error ? (
                                <p className="px-4 py-4 text-sm text-rose-600">{error}</p>
                            ) : clients.length === 0 ? (
                                <p className="px-4 py-4 text-sm text-slate-500">No se encontraron clientes.</p>
                            ) : (
                                clients.map((client) => (
                                    <button
                                        key={client.clientID}
                                        type="button"
                                        onClick={() => selectClient(client)}
                                        className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-slate-800"
                                    >
                                        <span className="block text-sm font-medium text-slate-900 dark:text-white">
                                            {client.name}
                                        </span>
                                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-300">
                                            {client.rut}
                                            {client.email ? ` · ${client.email}` : ""}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
            {isDialogOpen && (
                <ClientDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    onSaved={selectClient}
                />
            )}
        </section>
    )
}
