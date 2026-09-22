"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
    getActiveCashSession,
    getCashRegisters,
    getStoreCashSummary,
} from "@/actions/cash-registers/cashRegisters"
import CashRegisterFormDialog from "@/components/CashRegisters/CashRegisterFormDialog"
import CashCatalogsDialog from "@/components/CashRegisters/CashCatalogsDialog"
import CashSessionDialog from "@/components/CashRegisters/CashSessionDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type {
    CashRegisterStatus,
    ICashRegister,
    ICashSession,
    IStoreCashSummary,
} from "@/interfaces/cash-registers/ICashRegister"
import { cn } from "@/lib/utils"
import { useTienda } from "@/stores/tienda.store"
import {
    Activity,
    Banknote,
    Calculator,
    CircleDollarSign,
    CreditCard,
    Edit3,
    Plus,
    RefreshCw,
    Search,
    Settings2,
    Store,
    WalletCards,
} from "lucide-react"
import { toast } from "sonner"

type StatusFilter = "ALL" | CashRegisterStatus

const toCLP = (value: number | null | undefined) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value ?? 0)

const statusLabels: Record<CashRegisterStatus, string> = {
    ACTIVE: "Activa",
    INACTIVE: "Inactiva",
    MAINTENANCE: "Mantenimiento",
}

const statusStyles: Record<CashRegisterStatus, string> = {
    ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800",
    INACTIVE: "border-slate-200 bg-slate-100 text-slate-700",
    MAINTENANCE: "border-amber-200 bg-amber-50 text-amber-800",
}

export default function CashRegistersClient() {
    const searchParams = useSearchParams()
    const storeSelected = useTienda((state) => state.storeSelected)
    const storeID = storeSelected?.storeID || searchParams.get("storeID") || ""
    const [registers, setRegisters] = useState<ICashRegister[]>([])
    const [activeSessions, setActiveSessions] = useState<Record<string, ICashSession | null>>({})
    const [summary, setSummary] = useState<IStoreCashSummary | null>(null)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
    const [isLoading, setIsLoading] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingRegister, setEditingRegister] = useState<ICashRegister | null>(null)
    const [sessionRegister, setSessionRegister] = useState<ICashRegister | null>(null)
    const [isSessionOpen, setIsSessionOpen] = useState(false)
    const [isCatalogsOpen, setIsCatalogsOpen] = useState(false)

    const loadData = useCallback(async () => {
        if (!storeID) {
            setRegisters([])
            setActiveSessions({})
            setSummary(null)
            setLoadError(null)
            return
        }

        setIsLoading(true)
        setLoadError(null)
        try {
            const [registerResponse, summaryResponse] = await Promise.all([
                getCashRegisters({ storeID }),
                getStoreCashSummary(storeID).catch(() => null),
            ])
            setRegisters(registerResponse)
            setSummary(summaryResponse)

            const sessionResults = await Promise.allSettled(
                registerResponse.map(async (register) => ({
                    cashRegisterID: register.cashRegisterID,
                    session: await getActiveCashSession(register.cashRegisterID),
                })),
            )
            const nextSessions: Record<string, ICashSession | null> = {}
            sessionResults.forEach((result, index) => {
                const registerID = registerResponse[index].cashRegisterID
                nextSessions[registerID] = result.status === "fulfilled" ? result.value.session : null
            })
            setActiveSessions(nextSessions)
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudieron cargar las cajas"
            setLoadError(message)
            toast.error(message)
        } finally {
            setIsLoading(false)
        }
    }, [storeID])

    useEffect(() => {
        void loadData()
    }, [loadData])

    const filteredRegisters = useMemo(() => {
        const query = search.trim().toLowerCase()
        return registers.filter((register) => {
            const matchesStatus = statusFilter === "ALL" || register.status === statusFilter
            const matchesSearch = !query || register.name.toLowerCase().includes(query) || register.code.toLowerCase().includes(query)
            return matchesStatus && matchesSearch
        })
    }, [registers, search, statusFilter])

    const openSessionCount = Object.values(activeSessions).filter(Boolean).length

    const handleCreate = () => {
        setEditingRegister(null)
        setIsFormOpen(true)
    }

    const handleEdit = (register: ICashRegister) => {
        setEditingRegister(register)
        setIsFormOpen(true)
    }

    const handleSession = (register: ICashRegister) => {
        setSessionRegister(register)
        setIsSessionOpen(true)
    }

    return (
        <div className="mx-auto flex-1 px-4 py-2 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cajas</h1>
                    <p className="mt-2 text-gray-600 dark:text-slate-300">Administra cajas físicas o virtuales y sus turnos operativos.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCatalogsOpen(true)}><Settings2 className="h-4 w-4" /> Catálogos de caja</Button>
                    <Button type="button" onClick={handleCreate} disabled={!storeID} className="bg-slate-700 text-white hover:bg-slate-800">
                        <Plus className="h-4 w-4" /> Nueva caja
                    </Button>
                </div>
            </div>

            {!storeID && (
                <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Selecciona una tienda para administrar sus cajas.
                </div>
            )}

            {loadError && (
                <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <span>{loadError}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => void loadData()}><RefreshCw className="h-4 w-4" /> Reintentar</Button>
                </div>
            )}

            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Cajas registradas" value={registers.length} icon={WalletCards} tone="slate" />
                <SummaryCard label="Turnos abiertos" value={summary?.openSessionCount ?? openSessionCount} icon={Activity} tone="emerald" />
                <SummaryCard label="Cobros últimos 30 días" value={toCLP(summary?.payments.totalAmount)} icon={CircleDollarSign} tone="sky" />
                <SummaryCard label="Diferencia acumulada" value={toCLP(summary?.cashDifferenceTotal)} icon={Calculator} tone={(summary?.cashDifferenceTotal ?? 0) === 0 ? "emerald" : "rose"} />
            </div>

            <div className="mb-5 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:grid-cols-[1fr_220px]">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o código..." className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos los estados</SelectItem>
                        <SelectItem value="ACTIVE">Activas</SelectItem>
                        <SelectItem value="INACTIVE">Inactivas</SelectItem>
                        <SelectItem value="MAINTENANCE">En mantenimiento</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {isLoading && registers.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">Cargando cajas...</div>
            ) : filteredRegisters.length ? (
                <div className="grid gap-4 xl:grid-cols-2">
                    {filteredRegisters.map((register) => {
                        const activeSession = activeSessions[register.cashRegisterID]
                        return (
                            <article key={register.cashRegisterID} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-white"><Store className="h-5 w-5" /></span>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="truncate font-bold text-slate-950 dark:text-white">{register.name}</h2>
                                                <Badge variant="outline" className={statusStyles[register.status]}>{statusLabels[register.status]}</Badge>
                                            </div>
                                            <p className="mt-1 text-sm font-semibold text-slate-500">{register.code}</p>
                                        </div>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" title="Editar caja" onClick={() => handleEdit(register)}><Edit3 className="h-4 w-4" /></Button>
                                </div>

                                <div className={cn("mt-5 rounded-lg border px-4 py-3", activeSession ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900")}>
                                    {activeSession ? (
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-bold uppercase text-emerald-700">Turno abierto</p>
                                                <p className="mt-1 text-sm text-slate-700">Fondo inicial: {toCLP(activeSession.openingBalance)}</p>
                                                <p className="text-xs text-slate-500">Fecha contable: {activeSession.businessDate}</p>
                                            </div>
                                            <Badge className="bg-emerald-700 text-white">En operación</Badge>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sin turno activo</p>
                                            <p className="text-xs text-slate-500">La caja está disponible para una nueva apertura.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <Button
                                        type="button"
                                        variant={activeSession ? "default" : "outline"}
                                        onClick={() => handleSession(register)}
                                        disabled={!activeSession && register.status !== "ACTIVE"}
                                        className={activeSession ? "bg-emerald-700 text-white hover:bg-emerald-800" : ""}
                                    >
                                        <Banknote className="h-4 w-4" /> {activeSession ? "Gestionar turno" : "Abrir turno"}
                                    </Button>
                                </div>
                            </article>
                        )
                    })}
                </div>
            ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-800">
                    <WalletCards className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-3 font-semibold text-slate-800 dark:text-white">No hay cajas para mostrar</p>
                    <p className="mt-1 text-sm text-slate-500">Crea la primera caja de esta tienda o cambia los filtros.</p>
                </div>
            )}

            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3"><CreditCard className="mt-0.5 h-5 w-5" /><div><p className="text-sm font-bold">Operación de caja configurada</p><p className="mt-1 text-xs text-emerald-800">Administra medios de pago, razones de movimiento y denominaciones; úsalos dentro de cada turno abierto.</p></div></div>
                    <Button type="button" variant="outline" onClick={() => setIsCatalogsOpen(true)} className="border-emerald-300 bg-white"><Settings2 className="h-4 w-4" /> Configurar</Button>
                </div>
            </div>

            {storeID && (
                <CashRegisterFormDialog
                    open={isFormOpen}
                    onOpenChange={setIsFormOpen}
                    storeID={storeID}
                    register={editingRegister}
                    onSaved={loadData}
                />
            )}
            <CashSessionDialog
                open={isSessionOpen}
                onOpenChange={setIsSessionOpen}
                register={sessionRegister}
                activeSession={sessionRegister ? activeSessions[sessionRegister.cashRegisterID] ?? null : null}
                onChanged={loadData}
            />
            <CashCatalogsDialog open={isCatalogsOpen} onOpenChange={setIsCatalogsOpen} />
        </div>
    )
}

function SummaryCard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: typeof WalletCards; tone: "slate" | "emerald" | "sky" | "rose" }) {
    const styles = {
        slate: "border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white",
        emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
        sky: "border-sky-200 bg-sky-50 text-sky-800",
        rose: "border-rose-200 bg-rose-50 text-rose-800",
    }
    return (
        <div className={cn("flex items-center gap-3 rounded-lg border p-4 shadow-sm", styles[tone])}>
            <Icon className="h-5 w-5 shrink-0" />
            <div className="min-w-0"><p className="truncate text-xl font-black">{value}</p><p className="text-xs font-semibold">{label}</p></div>
        </div>
    )
}
