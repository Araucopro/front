"use client"

import { useMemo, useState } from "react"
import { SaleDocumentPreviewDialog } from "@/components/SalesHistory/SaleDocumentPreviewDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ISaleResponse } from "@/interfaces/sales/ISale"
import { cn } from "@/lib/utils"
import { getChileYYYYMMDD, isYYYYMMDD, toChileMiddayUTC } from "@/utils/chile-date"
import { toPrice } from "@/utils/priceFormat"
import { getSalePaymentBreakdown, getSalePaymentLabel } from "@/utils/sale-payments"
import { AlertCircle, Ban, CheckCircle2, Download, Eye, List, Search, X } from "lucide-react"

type HistoryFilter = "GENERAL" | "ISSUED" | "REJECTED" | "VOIDED"

type SalesHistoryClientProps = {
    initialSales: ISaleResponse[]
    loadError?: string
}

const filterOptions: Array<{
    value: HistoryFilter
    label: string
    icon: typeof List
}> = [
    { value: "GENERAL", label: "Generales", icon: List },
    { value: "ISSUED", label: "Emitido", icon: CheckCircle2 },
    { value: "REJECTED", label: "Rechazado", icon: AlertCircle },
    { value: "VOIDED", label: "Anulado", icon: Ban },
]

const saleTypeLabels: Record<string, string> = {
    BOLETA: "Boleta electrónica",
    FACTURA: "Factura electrónica",
    NOTA_VENTA: "Venta general",
}

const saleTypePrefixes: Record<string, string> = {
    BOLETA: "BOL-EE",
    FACTURA: "FAC-EE",
    NOTA_VENTA: "VENTA",
}

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Santiago",
})

const normalizeText = (value: unknown) =>
    String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()

const getDteStatus = (sale: ISaleResponse) => sale.dte?.STATUS?.trim().toUpperCase() ?? ""

const matchesStatus = (sale: ISaleResponse, filter: HistoryFilter) => {
    const dteStatus = getDteStatus(sale)
    const saleStatus = sale.status?.toUpperCase()

    if (filter === "ISSUED") return ["EMITIDO", "EMITIDA", "ACEPTADO"].includes(dteStatus)
    if (filter === "REJECTED") return ["ERROR", "RECHAZADO", "REJECTED"].includes(dteStatus)
    if (filter === "VOIDED") return saleStatus === "ANULADA" || dteStatus === "ANULADO"
    return true
}

const getStatusPresentation = (sale: ISaleResponse) => {
    const dteStatus = getDteStatus(sale)
    const saleStatus = sale.status?.toUpperCase()

    if (saleStatus === "ANULADA" || dteStatus === "ANULADO") {
        return { label: "Anulado", className: "border-slate-300 bg-slate-100 text-slate-700" }
    }
    if (["ERROR", "RECHAZADO", "REJECTED"].includes(dteStatus)) {
        return { label: "Rechazado", className: "border-rose-200 bg-rose-50 text-rose-700" }
    }
    if (["EMITIDO", "EMITIDA", "ACEPTADO"].includes(dteStatus)) {
        return { label: "Emitido", className: "border-emerald-200 bg-emerald-50 text-emerald-700" }
    }
    if (sale.dte) {
        return { label: dteStatus || "Pendiente SII", className: "border-amber-200 bg-amber-50 text-amber-700" }
    }
    return { label: "Venta general", className: "border-blue-200 bg-blue-50 text-blue-700" }
}

const getReceiver = (sale: ISaleResponse) => {
    const name = sale.receiver?.name?.trim()
    const rut = sale.receiver?.rut?.trim()
    if (name && rut) return `${rut} · ${name}`
    return name || rut || "Cliente general"
}

const getSaleDate = (sale: ISaleResponse) => {
    const issueDate = sale.issueDate?.slice(0, 10)
    if (issueDate && isYYYYMMDD(issueDate)) return issueDate

    const createdAt = new Date(sale.createdAt)
    return Number.isNaN(createdAt.getTime()) ? "" : getChileYYYYMMDD(createdAt)
}

const escapeCsvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`

export function SalesHistoryClient({ initialSales, loadError }: SalesHistoryClientProps) {
    const [activeFilter, setActiveFilter] = useState<HistoryFilter>("GENERAL")
    const [search, setSearch] = useState("")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")
    const [selectedSale, setSelectedSale] = useState<ISaleResponse | null>(null)

    const salesInDateRange = useMemo(
        () =>
            initialSales.filter((sale) => {
                if (!dateFrom && !dateTo) return true
                const date = getSaleDate(sale)
                return Boolean(date) && (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo)
            }),
        [dateFrom, dateTo, initialSales],
    )

    const counts = useMemo(
        () =>
            filterOptions.reduce<Record<HistoryFilter, number>>(
                (result, option) => ({
                    ...result,
                    [option.value]: salesInDateRange.filter((sale) => matchesStatus(sale, option.value)).length,
                }),
                { GENERAL: 0, ISSUED: 0, REJECTED: 0, VOIDED: 0 },
            ),
        [salesInDateRange],
    )

    const visibleSales = useMemo(() => {
        const query = normalizeText(search).trim()

        return salesInDateRange.filter((sale) => {
            if (!matchesStatus(sale, activeFilter)) return false
            if (!query) return true

            const searchable = normalizeText(
                [
                    sale.saleID,
                    sale.saleType,
                    sale.folio,
                    sale.dte?.FOLIO,
                    sale.dte?.STATUS,
                    sale.receiver?.rut,
                    sale.receiver?.name,
                    sale.receiver?.email,
                    getSalePaymentLabel(sale),
                    sale.Store?.name,
                ].join(" "),
            )
            return searchable.includes(query)
        })
    }, [activeFilter, salesInDateRange, search])

    const exportCsv = () => {
        const rows = visibleSales.map((sale) => [
            saleTypeLabels[sale.saleType ?? ""] ?? sale.saleType ?? "Venta",
            sale.dte?.FOLIO ?? sale.folio ?? sale.saleID,
            sale.issueDate ?? sale.createdAt,
            sale.receiver?.rut ?? "",
            sale.receiver?.name ?? "Cliente general",
            sale.receiver?.email ?? "",
            getStatusPresentation(sale).label,
            getSalePaymentBreakdown(sale)
                .map((payment) => `${payment.label}: $${toPrice(payment.amount)}`)
                .join(" + "),
            sale.Store?.name ?? "",
            sale.total,
        ])
        const header = ["Tipo", "Folio", "Fecha", "RUT", "Receptor", "Email", "Estado", "Pago", "Tienda", "Total"]
        const csv = [header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n")
        const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = `historial-ventas-${activeFilter.toLowerCase()}.csv`
        anchor.click()
        URL.revokeObjectURL(url)
    }

    return (
        <>
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="h-fit overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Estados</p>
                </div>
                <nav aria-label="Estados del historial de ventas" className="p-2">
                    {filterOptions.map((option) => {
                        const Icon = option.icon
                        const active = activeFilter === option.value

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setActiveFilter(option.value)}
                                className={cn(
                                    "mb-1 flex w-full items-center justify-between rounded-lg border-l-4 px-3 py-3 text-left text-sm transition last:mb-0",
                                    active
                                        ? "border-l-blue-500 bg-blue-50 font-semibold text-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
                                        : "border-l-transparent text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800",
                                )}
                            >
                                <span className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    {option.label}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {counts[option.value]}
                                </span>
                            </button>
                        )
                    })}
                </nav>
            </aside>

            <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="space-y-4 border-b border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                                {filterOptions.find((option) => option.value === activeFilter)?.label}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                {visibleSales.length} de {salesInDateRange.length} registros
                            </p>
                        </div>
                        <Button type="button" variant="outline" onClick={exportCsv} disabled={visibleSales.length === 0}>
                            <Download className="h-4 w-4" />
                            Exportar
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="relative min-w-56 flex-1 sm:min-w-64">
                            <label htmlFor="sales-history-search" className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Buscar venta
                            </label>
                            <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-slate-400" />
                            <Input
                                id="sales-history-search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Folio, cliente, RUT o tienda..."
                                className="pl-9"
                            />
                        </div>
                        <div className="min-w-36 flex-1 sm:max-w-48">
                            <label htmlFor="sales-history-date-from" className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Desde
                            </label>
                            <Input
                                id="sales-history-date-from"
                                type="date"
                                value={dateFrom}
                                max={dateTo || undefined}
                                onChange={(event) => setDateFrom(event.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div className="min-w-36 flex-1 sm:max-w-48">
                            <label htmlFor="sales-history-date-to" className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Hasta
                            </label>
                            <Input
                                id="sales-history-date-to"
                                type="date"
                                value={dateTo}
                                min={dateFrom || undefined}
                                onChange={(event) => setDateTo(event.target.value)}
                                className="w-full"
                            />
                        </div>
                        {(dateFrom || dateTo) && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setDateFrom("")
                                    setDateTo("")
                                }}
                            >
                                <X className="h-4 w-4" />
                                Limpiar fechas
                            </Button>
                        )}
                    </div>
                </div>

                {loadError && (
                    <div className="m-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Algunos registros no pudieron cargarse: {loadError}
                    </div>
                )}

                <div className="max-h-[calc(100vh-290px)] min-h-[360px] overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                            <TableRow>
                                <TableHead className="min-w-44">Tipo / folio</TableHead>
                                <TableHead className="min-w-36">Fecha</TableHead>
                                <TableHead className="min-w-64">Receptor</TableHead>
                                <TableHead className="min-w-52">Email destino</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Pago</TableHead>
                                <TableHead className="min-w-36">Tienda</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="w-16 text-center">Detalle</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleSales.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-52 text-center text-slate-500">
                                        No hay ventas para este estado o búsqueda.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                visibleSales.map((sale) => {
                                    const status = getStatusPresentation(sale)
                                    const folio = sale.dte?.FOLIO ?? sale.folio
                                    const prefix = saleTypePrefixes[sale.saleType ?? ""] ?? "VENTA"

                                    return (
                                        <TableRow
                                            key={sale.saleID}
                                            className="cursor-pointer hover:bg-blue-50/60 dark:hover:bg-slate-800"
                                            onDoubleClick={() => setSelectedSale(sale)}
                                        >
                                            <TableCell>
                                                <p className="font-medium text-slate-900 dark:text-white">
                                                    {folio ? `${prefix}-${folio}` : `${prefix}-${sale.saleID.slice(0, 8)}`}
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    {saleTypeLabels[sale.saleType ?? ""] ?? sale.saleType ?? "Venta"}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {getSaleDate(sale)
                                                    ? dateFormatter.format(toChileMiddayUTC(getSaleDate(sale)))
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <p className="max-w-72 truncate text-sm" title={getReceiver(sale)}>
                                                    {getReceiver(sale)}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                                                {sale.receiver?.email || "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={status.className}>
                                                    {status.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div className="space-y-0.5">
                                                    {getSalePaymentBreakdown(sale).map((payment, index) => (
                                                        <p key={`${payment.label}-${index}`} className="whitespace-nowrap">
                                                            {payment.label}
                                                            <span className="ml-1 text-xs text-slate-500">
                                                                ${toPrice(payment.amount)}
                                                            </span>
                                                        </p>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{sale.Store?.name || "—"}</TableCell>
                                            <TableCell className="text-right font-semibold tabular-nums">
                                                ${toPrice(sale.total)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Ver detalle de la venta"
                                                    onClick={() => setSelectedSale(sale)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </section>
        </div>
        <SaleDocumentPreviewDialog sale={selectedSale} onClose={() => setSelectedSale(null)} />
        </>
    )
}
