"use client"

import React, { useMemo, useState } from "react"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { ISaleProduct, ISaleResponse } from "@/interfaces/sales/ISale"
import { IPurchaseOrder } from "@/interfaces/orders/IPurchaseOrder"
import { useRouter } from "next/navigation"
import { toPrice } from "@/utils/priceFormat"
import { getAnulatedProducts } from "@/lib/getAnulatedProducts"
import { CalendarDays, Eye, MoreHorizontal, RefreshCw, RotateCcw, Search } from "lucide-react"
import { AnularVentaModal } from "@/components/Modals/AnularVentaModal"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type TableItem = ISaleResponse | IPurchaseOrder

const saleTypeLabels: Record<string, string> = {
    BOLETA: "Boleta",
    FACTURA: "Factura",
    NOTA_VENTA: "Nota de venta",
}

interface Props {
    items: TableItem[]
}

const normalizeText = (value: unknown) => {
    if (value === null || value === undefined) return ""
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
}

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    timeZone: "America/Santiago",
})

const monthFormatter = new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
})

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    numberingSystem: "latn",
    timeZone: "America/Santiago",
})

const getItemDate = (item: TableItem) => {
    const date = new Date(item.createdAt)
    return Number.isNaN(date.getTime()) ? new Date(0) : date
}

const formatDayLabel = (date: Date) => dateFormatter.format(date).replace(".", "").toUpperCase()

const formatMonthLabel = (date: Date) => monthFormatter.format(date).toUpperCase()

const getStoreName = (item: TableItem) => {
    const storeName = ("store" in item ? item.store?.name : undefined) || item.Store?.name
    if (!storeName || normalizeText(storeName) === "haulmer") return "Caja Arauco"

    return storeName
}

const getSaleTotals = (item: ISaleResponse) => {
    const nulledProducts = getAnulatedProducts(item)
    const returnedProductAmount = nulledProducts.reduce((acc, p) => acc + p.quantitySold * Number(p.unitPrice), 0)
    const completedDiscountAmount = (item.Returns ?? [])
        .filter((ret) => ret.status === "COMPLETADA" && ret.returnType === "DESCUENTO")
        .reduce((total, ret) => total + ret.discountAmount, 0)
    const totalNulledAmount = returnedProductAmount + completedDiscountAmount

    return {
        nulledProducts,
        totalNulledAmount,
    }
}

const getSaleDisplayStatus = (sale: ISaleResponse) => {
    const completedReturns = (sale.Returns ?? []).filter((ret) => ret.status === "COMPLETADA")
    if (sale.status === "Anulado" || sale.status === "ANULADA" || completedReturns.some((ret) => ret.returnType === "TOTAL")) {
        return "ANULADA"
    }
    if (sale.status === "DEVUELTA" || completedReturns.length > 0) return "DEVUELTA"
    if ((sale.Returns ?? []).some((ret) => ret.status === "PENDIENTE" || ret.status === "APROBADA")) {
        return "DEVOLUCIÓN PENDIENTE"
    }
    return sale.status
}

const getSaleProductLabel = (saleProduct: ISaleProduct) => {
    const variationLabel = [
        saleProduct.variation?.color,
        saleProduct.variation?.size,
    ]
        .filter(Boolean)
        .join(" ")
        .trim()

    return saleProduct.productName?.trim() || saleProduct.variation?.sku?.trim() || variationLabel || "Producto"
}

const getSaleProductSearchText = (saleProduct: ISaleProduct) => {
    return [
        getSaleProductLabel(saleProduct),
        saleProduct.variation?.sku,
        saleProduct.variation?.color,
        saleProduct.variation?.size,
    ]
        .filter(Boolean)
        .join(" ")
}

const getActiveSaleProducts = (item: ISaleResponse, nulledProducts: ISaleProduct[]) => {
    return (item.SaleProducts ?? []).flatMap((sp, index) => {
        const nulled = nulledProducts.find((np) => np.saleProductID === sp.saleProductID)
        const actualQuantity = sp.quantitySold - (nulled?.quantitySold || 0)
        if (actualQuantity <= 0) return []

        return [
            {
                key: sp.saleItemID || sp.saleProductID || sp.variationID || `${item.saleID}-${index}`,
                quantity: actualQuantity,
                label: getSaleProductLabel(sp),
                searchText: getSaleProductSearchText(sp),
            },
        ]
    })
}

const getProductsSearchText = (item: TableItem) => {
    if ("saleID" in item) {
        const { nulledProducts } = getSaleTotals(item)
        return getActiveSaleProducts(item, nulledProducts)
            .map((product) => `${product.quantity} x ${product.searchText}`)
            .join(" ")
    }

    const itemsOrdered = item.PurchaseOrderItems?.reduce((acc, poi) => acc + poi.quantity, 0) ?? 0
    return `${itemsOrdered} unidades`
}

const buildSearchText = (item: TableItem) => {
    const date = getItemDate(item)
    const amountText =
        "saleID" in item
            ? typeof item.total === "number"
                ? `$${toPrice(Math.max(item.total - getSaleTotals(item).totalNulledAmount, 0))}`
                : "Sin dato"
            : item.total
              ? `$${toPrice(Number(item.total))}`
              : "Sin dato"

    if ("saleID" in item) {
        return [
            getStoreName(item),
            date.toISOString(),
            date.toLocaleString("es-CL"),
            getProductsSearchText(item),
            getSaleDisplayStatus(item),
            item.saleType,
            item.dte?.FOLIO,
            item.paymentType,
            amountText,
        ].join(" ")
    }

    const typeLabel = item.isThirdParty ? "Tercero" : "Interna"
    return [getStoreName(item), date.toISOString(), date.toLocaleString("es-CL"), getProductsSearchText(item), item.status, typeLabel, amountText].join(
        " ",
    )
}

const statusClassName = (status: string) => {
    if (["Pagado", "EMITIDA", "CONVERTIDA"].includes(status)) {
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"
    }
    if (status === "Pendiente" || status === "DEVOLUCIÓN PENDIENTE") {
        return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
    }
    return "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200"
}

const paymentClassName = (paymentType?: string) => {
    if (paymentType === "Efectivo") {
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
    }
    if (paymentType === "Debito" || paymentType === "Credito") {
        return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200"
    }
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
}

const SalesTable: React.FC<Props> = ({ items }) => {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedSale, setSelectedSale] = useState<ISaleResponse | null>(null)

    const filteredItems = useMemo(() => {
        const query = normalizeText(searchTerm)
        if (!query) return items
        return items.filter((item) => normalizeText(buildSearchText(item)).includes(query))
    }, [items, searchTerm])

    const groupedItems = useMemo(() => {
        const groups = new Map<string, TableItem[]>()

        for (const item of filteredItems) {
            const month = formatMonthLabel(getItemDate(item))
            groups.set(month, [...(groups.get(month) ?? []), item])
        }

        return Array.from(groups.entries())
    }, [filteredItems])

    const urlRedirectToSingleSale = (item: TableItem) => {
        if ("saleID" in item) {
            router.push(`/home/${item.saleID}?storeID=${item.storeID}`)
            return
        }

        router.push(`/home/order/${item.purchaseOrderID}?storeID=${item.storeID}`)
    }

    return (
        <div className="overflow-hidden rounded-lg bg-transparent">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por producto, código, talla, tipo de pago, estado..."
                        className="h-11 rounded-lg border-slate-200 bg-white pl-11 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <CalendarDays className="h-4 w-4 text-blue-500" />
                        <span className="text-slate-500">Periodo:</span>
                        <span className="font-semibold">Todas las fechas</span>
                    </div>
                    <button
                        type="button"
                        title="Actualizar diario"
                        onClick={() => router.refresh()}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-950">
                            <TableHead className="w-[180px] text-[11px] uppercase tracking-[0.12em]">Hora</TableHead>
                            <TableHead className="text-[11px] uppercase tracking-[0.12em]">Origen</TableHead>
                            <TableHead className="text-[11px] uppercase tracking-[0.12em]">Productos</TableHead>
                            <TableHead className="text-[11px] uppercase tracking-[0.12em]">Tipo de pago</TableHead>
                            <TableHead className="text-[11px] uppercase tracking-[0.12em]">Total</TableHead>
                            <TableHead className="text-[11px] uppercase tracking-[0.12em]">Estado</TableHead>
                            <TableHead className="w-12" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groupedItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">
                                    No hay ventas ni órdenes para mostrar.
                                </TableCell>
                            </TableRow>
                        ) : (
                            groupedItems.map(([month, monthItems]) => (
                                <React.Fragment key={month}>
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="bg-slate-950 py-2 text-xs font-bold uppercase text-white dark:bg-slate-800"
                                        >
                                            <span className="mr-2">▣</span>
                                            {month}
                                        </TableCell>
                                    </TableRow>
                                    {monthItems.map((item) => {
                                        const date = getItemDate(item)

                                        if ("saleID" in item) {
                                            const { nulledProducts, totalNulledAmount } = getSaleTotals(item)
                                            const products = getActiveSaleProducts(item, nulledProducts)
                                            const visibleProducts = products.slice(0, 2)
                                            const extraProductsCount = Math.max(products.length - visibleProducts.length, 0)

                                            const statusText = getSaleDisplayStatus(item)
                                            const amount =
                                                typeof item.total === "number"
                                                    ? `$${toPrice(Math.max(item.total - totalNulledAmount, 0))}`
                                                    : "Sin dato"

                                            return (
                                                <TableRow
                                                    key={item.saleID}
                                                    className="cursor-pointer border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                                                    onClick={() => urlRedirectToSingleSale(item)}
                                                >
                                                    <TableCell className="align-top">
                                                        <p className="inline-flex bg-white text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                                            {formatDayLabel(date)}
                                                        </p>
                                                        <p className="mt-4 text-xs text-slate-500">
                                                            {timeFormatter.format(date)}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="align-middle">
                                                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                            {getStoreName(item)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="max-w-[520px] align-middle text-sm">
                                                        <div className="space-y-1">
                                                            {visibleProducts.map((product) => (
                                                                <p key={product.key}>
                                                                    {product.quantity} x {product.label}
                                                                </p>
                                                            ))}
                                                            {extraProductsCount > 0 && (
                                                                <p className="text-xs font-semibold text-slate-500">
                                                                    +{extraProductsCount} más
                                                                </p>
                                                            )}
                                                            {products.length === 0 && (
                                                                <p className="italic text-rose-600">
                                                                    Venta anulada por completo
                                                                </p>
                                                            )}
                                                            {item.saleType && (
                                                                <p className="text-xs text-slate-500">
                                                                    {saleTypeLabels[item.saleType] ?? item.saleType}
                                                                    {item.dte?.FOLIO ? ` · Folio ${item.dte.FOLIO}` : ""}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="align-middle">
                                                        <span
                                                            className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentClassName(
                                                                item.paymentType,
                                                            )}`}
                                                        >
                                                            {item.paymentType ?? "Sin dato"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="align-middle font-bold">{amount}</TableCell>
                                                    <TableCell className="align-middle">
                                                        <span
                                                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(
                                                                statusText,
                                                            )}`}
                                                        >
                                                            {statusText}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="align-middle">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button
                                                                    type="button"
                                                                    title="Acciones de venta"
                                                                    onClick={(event) => event.stopPropagation()}
                                                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:hover:text-white"
                                                                >
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                                                                <DropdownMenuItem onSelect={() => urlRedirectToSingleSale(item)}>
                                                                    <Eye className="mr-2 h-4 w-4" /> Ver detalle
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => setSelectedSale(item)} className="text-rose-700">
                                                                    <RotateCcw className="mr-2 h-4 w-4" /> Gestionar devolución
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        }

                                        const itemsOrdered =
                                            item.PurchaseOrderItems?.reduce((acc, poi) => acc + poi.quantity, 0) ?? 0
                                        const amount = item.total ? `$${toPrice(Number(item.total))}` : "Sin dato"

                                        return (
                                            <TableRow
                                                key={item.purchaseOrderID}
                                                className="cursor-pointer border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                                                onClick={() => urlRedirectToSingleSale(item)}
                                            >
                                                <TableCell className="align-top">
                                                    <p className="inline-flex bg-white text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                                        {formatDayLabel(date)}
                                                    </p>
                                                    <p className="mt-4 text-xs text-slate-500">
                                                        {timeFormatter.format(date)}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="align-middle">
                                                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                        {getStoreName(item)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="align-middle text-sm">
                                                    {itemsOrdered} unidades
                                                </TableCell>
                                                <TableCell className="align-middle">
                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                        {item.isThirdParty ? "Tercero" : "Interna"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="align-middle font-bold">{amount}</TableCell>
                                                <TableCell className="align-middle">
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(
                                                            item.status,
                                                        )}`}
                                                    >
                                                        {item.status}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="align-middle">
                                                    <button
                                                        type="button"
                                                        title="Ver detalle"
                                                        onClick={(event) => {
                                                            event.stopPropagation()
                                                            urlRedirectToSingleSale(item)
                                                        }}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:hover:text-white"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </React.Fragment>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            {selectedSale && (
                <AnularVentaModal
                    isOpen
                    setIsOpen={(open) => {
                        if (!open) setSelectedSale(null)
                    }}
                    sale={selectedSale}
                />
            )}
        </div>
    )
}

export default SalesTable
