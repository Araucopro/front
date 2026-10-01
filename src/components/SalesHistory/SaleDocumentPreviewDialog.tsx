"use client"

import { useEffect, useRef, useState } from "react"
import { pdf } from "@react-pdf/renderer"
import { useReactToPrint } from "react-to-print"
import { getDteDocumentPdf } from "@/actions/dte/getDteDocument"
import { getSingleSale } from "@/actions/sales/getSales"
import { SalePreviewPdfDocument } from "@/components/SalesHistory/SalePreviewPdfDocument"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ISaleResponse } from "@/interfaces/sales/ISale"
import { getChileYYYYMMDD, isYYYYMMDD, toChileMiddayUTC } from "@/utils/chile-date"
import { toPrice } from "@/utils/priceFormat"
import { Download, FileText, Loader2, Printer, RotateCcw } from "lucide-react"
import { toast } from "sonner"

type SaleDocumentPreviewDialogProps = {
    sale: ISaleResponse | null
    onClose: () => void
}

const documentLabels: Record<string, string> = {
    BOLETA: "Boleta electrónica",
    FACTURA: "Factura electrónica",
    NOTA_VENTA: "Nota de venta",
}

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
})

const formatIssueDate = (sale: ISaleResponse) => {
    const issueDate = sale.issueDate?.slice(0, 10)
    if (issueDate && isYYYYMMDD(issueDate)) return dateFormatter.format(toChileMiddayUTC(issueDate))

    const createdAt = new Date(sale.createdAt)
    if (Number.isNaN(createdAt.getTime())) return "Sin fecha"
    return dateFormatter.format(toChileMiddayUTC(getChileYYYYMMDD(createdAt)))
}

const formatMoney = (amount: number | string) => `$${toPrice(Number(amount))}`

function SaleDocument({ sale }: { sale: ISaleResponse }) {
    const issuer = sale.Store
    const receiver = sale.receiver
    const documentName = documentLabels[sale.saleType ?? ""] ?? "Documento de venta"
    const folio = sale.dte?.FOLIO ?? sale.folio

    return (
        <article className="mx-auto flex min-h-[950px] w-[794px] flex-col border border-slate-200 bg-white px-12 py-10 text-slate-900 shadow-xl">
            <header className="grid grid-cols-[1fr_250px] gap-10">
                <div>
                    <div className="mb-4 flex h-14 w-32 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xl font-bold tracking-tight text-slate-600">
                        {issuer?.name?.slice(0, 2).toUpperCase() || "AR"}
                    </div>
                    <h3 className="text-lg font-bold uppercase leading-tight">
                        {issuer?.businessName || issuer?.name || "Emisor sin datos"}
                    </h3>
                    {issuer?.giro && <p className="mt-1 text-xs uppercase">Giro: {issuer.giro}</p>}
                    {(issuer?.address || issuer?.city) && (
                        <p className="mt-1 text-xs uppercase">
                            {[issuer.address, issuer.city].filter(Boolean).join(", ")}
                        </p>
                    )}
                    {issuer?.phone && <p className="mt-1 text-xs">Teléfono: {issuer.phone}</p>}
                </div>

                <div>
                    <div className={`min-h-32 border-2 px-4 py-4 text-center ${sale.dte ? "border-red-600" : "border-slate-400"}`}>
                        <p className="text-base font-bold">RUT: {issuer?.rut || "Sin RUT"}</p>
                        <p className="mt-2 text-sm font-extrabold uppercase">{documentName}</p>
                        <p className="mt-2 text-base font-bold">{folio ? `N° ${folio}` : "Sin folio"}</p>
                    </div>
                    <p className="mt-2 text-center text-xs font-semibold uppercase text-slate-600">
                        {issuer?.city || "Documento de venta"}
                    </p>
                </div>
            </header>

            <section className="mt-9 overflow-hidden rounded-md border border-slate-400 text-xs">
                <div className="grid grid-cols-[125px_1fr] border-b border-slate-300">
                    <span className="bg-slate-200 px-2 py-1 font-semibold">Señor(es)</span>
                    <span className="px-2 py-1">{receiver?.name || "Cliente general"}</span>
                </div>
                <div className="grid grid-cols-[125px_1fr_105px_1fr] border-b border-slate-300">
                    <span className="bg-slate-200 px-2 py-1 font-semibold">RUT</span>
                    <span className="px-2 py-1">{receiver?.rut || "—"}</span>
                    <span className="bg-slate-200 px-2 py-1 font-semibold">Fecha emisión</span>
                    <span className="px-2 py-1">{formatIssueDate(sale)}</span>
                </div>
                <div className="grid grid-cols-[125px_1fr_105px_1fr] border-b border-slate-300">
                    <span className="bg-slate-200 px-2 py-1 font-semibold">Dirección</span>
                    <span className="px-2 py-1">{receiver?.address || "—"}</span>
                    <span className="bg-slate-200 px-2 py-1 font-semibold">Comuna</span>
                    <span className="px-2 py-1">{receiver?.city || "—"}</span>
                </div>
                <div className="grid grid-cols-[125px_1fr]">
                    <span className="bg-slate-200 px-2 py-1 font-semibold">Contacto</span>
                    <span className="px-2 py-1">{receiver?.email || "—"}</span>
                </div>
            </section>

            <section className="mt-6 overflow-hidden rounded-md border border-slate-400">
                <p className="border-b border-slate-400 bg-slate-200 py-1 text-center text-[11px] font-bold uppercase">
                    Detalles
                </p>
                <table className="w-full table-fixed border-collapse text-[11px]">
                    <thead className="bg-slate-100 text-left">
                        <tr>
                            <th className="w-9 border-b border-r border-slate-300 px-2 py-1">N°</th>
                            <th className="border-b border-r border-slate-300 px-2 py-1">Descripción</th>
                            <th className="w-20 border-b border-r border-slate-300 px-2 py-1 text-right">Cant.</th>
                            <th className="w-24 border-b border-r border-slate-300 px-2 py-1 text-right">Prec. unit.</th>
                            <th className="w-24 border-b border-slate-300 px-2 py-1 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sale.SaleProducts.length > 0 ? (
                            sale.SaleProducts.map((item, index) => (
                                <tr key={item.saleItemID || `${item.variationID}-${index}`} className="align-top">
                                    <td className="border-b border-r border-slate-200 px-2 py-2">{index + 1}</td>
                                    <td className="border-b border-r border-slate-200 px-2 py-2">
                                        <span className="block break-words font-medium">
                                            {item.productName || "Producto sin nombre"}
                                        </span>
                                        {(item.variation.sku || item.variation.size) && (
                                            <span className="mt-0.5 block text-[10px] text-slate-500">
                                                {[item.variation.sku, item.variation.size].filter(Boolean).join(" · ")}
                                            </span>
                                        )}
                                    </td>
                                    <td className="border-b border-r border-slate-200 px-2 py-2 text-right">{item.quantitySold}</td>
                                    <td className="border-b border-r border-slate-200 px-2 py-2 text-right">
                                        {formatMoney(item.unitPrice)}
                                    </td>
                                    <td className="border-b border-slate-200 px-2 py-2 text-right font-semibold">
                                        {formatMoney(item.subtotal)}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                    El detalle de productos no está disponible en esta venta.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>

            <div className="mt-auto grid grid-cols-[1fr_250px] items-end gap-6 pt-12">
                <div className="rounded-md border border-slate-300 p-3 text-[11px] text-slate-500">
                    <p className="font-bold uppercase text-slate-700">Información</p>
                    <p className="mt-1">Medio de pago: {sale.paymentType || "No informado"}</p>
                    <p className="mt-1">ID de venta: {sale.saleID}</p>
                    <p className="mt-2 font-semibold text-amber-700">
                        Vista previa informativa. No sustituye el PDF oficial ni el timbre electrónico del SII.
                    </p>
                </div>
                <div className="overflow-hidden rounded-md border border-slate-400 text-xs">
                    <p className="border-b border-slate-400 bg-slate-200 py-1 text-center text-[11px] font-bold uppercase">
                        Totales
                    </p>
                    {sale.subtotal !== undefined && (
                        <p className="flex justify-between gap-4 border-b border-slate-300 px-2 py-1">
                            <span>Subtotal</span><span>{formatMoney(sale.subtotal)}</span>
                        </p>
                    )}
                    {sale.discount !== undefined && sale.discount > 0 && (
                        <p className="flex justify-between gap-4 border-b border-slate-300 px-2 py-1">
                            <span>Descuento</span><span>-{formatMoney(sale.discount)}</span>
                        </p>
                    )}
                    {sale.netTotal !== undefined && (
                        <p className="flex justify-between gap-4 border-b border-slate-300 px-2 py-1">
                            <span>Neto</span><span>{formatMoney(sale.netTotal)}</span>
                        </p>
                    )}
                    {sale.taxTotal !== undefined && (
                        <p className="flex justify-between gap-4 border-b border-slate-300 px-2 py-1">
                            <span>IVA</span><span>{formatMoney(sale.taxTotal)}</span>
                        </p>
                    )}
                    <p className="flex justify-between gap-4 bg-slate-100 px-2 py-2 font-bold">
                        <span>Total</span><span>{formatMoney(sale.total)}</span>
                    </p>
                </div>
            </div>
            <p className="mt-10 text-center text-[10px] text-slate-400">Vista previa informativa</p>
        </article>
    )
}

export function SaleDocumentPreviewDialog({ sale, onClose }: SaleDocumentPreviewDialogProps) {
    const printRef = useRef<HTMLDivElement>(null)
    const officialPdfRef = useRef<HTMLIFrameElement>(null)
    const [detail, setDetail] = useState<ISaleResponse | null>(null)
    const [officialPdfUrl, setOfficialPdfUrl] = useState<string | null>(null)
    const [officialPdfBlob, setOfficialPdfBlob] = useState<Blob | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [retry, setRetry] = useState(0)

    const printPreview = useReactToPrint({
        contentRef: printRef,
        documentTitle: `vista-previa-venta-${detail?.dte?.FOLIO ?? detail?.folio ?? detail?.saleID ?? ""}`,
        pageStyle: "@page { size: A4 portrait; margin: 0; } @media print { body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } article { width: 100% !important; min-height: 297mm !important; border: 0 !important; box-shadow: none !important; } }",
    })

    const handlePrint = () => {
        if (!officialPdfUrl) {
            void printPreview()
            return
        }

        try {
            const frameWindow = officialPdfRef.current?.contentWindow
            if (!frameWindow) throw new Error("El visor todavía no está listo.")
            frameWindow.focus()
            frameWindow.print()
        } catch {
            const openedWindow = window.open(officialPdfUrl, "_blank", "noopener,noreferrer")
            if (!openedWindow) toast.error("Permite las ventanas emergentes para imprimir el documento.")
        }
    }

    const handleDownload = async () => {
        if (!detail || isDownloading) return

        setIsDownloading(true)
        try {
            const blob = officialPdfBlob ?? (officialPdfUrl ? null : await pdf(<SalePreviewPdfDocument sale={detail} />).toBlob())
            const url = officialPdfUrl ?? (blob ? URL.createObjectURL(blob) : null)
            if (!url) throw new Error("No se pudo preparar el documento para descargar.")
            const link = document.createElement("a")
            link.href = url
            const documentType = detail.saleType === "FACTURA" ? "factura" : detail.saleType === "BOLETA" ? "boleta" : "venta"
            link.download = `${officialPdfUrl ? "dte" : "vista-previa"}-${documentType}-${detail.dte?.FOLIO ?? detail.folio ?? detail.saleID.slice(0, 8)}.pdf`
            document.body.appendChild(link)
            link.click()
            link.remove()
            if (!officialPdfUrl) window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
        } catch (downloadError) {
            toast.error(downloadError instanceof Error ? downloadError.message : "No se pudo descargar la vista previa.")
        } finally {
            setIsDownloading(false)
        }
    }

    useEffect(() => {
        if (!sale) return

        let cancelled = false
        let objectUrl: string | null = null
        setDetail(null)
        setOfficialPdfUrl(null)
        setOfficialPdfBlob(null)
        setError(null)
        setIsLoading(true)

        const loadDocument = async () => {
            try {
                const response = await getSingleSale(sale.saleID, sale.storeID)
                const nextDetail: ISaleResponse = {
                    ...response,
                    Store: response.Store?.storeID ? response.Store : sale.Store,
                    dte: response.dte ?? sale.dte,
                }
                if (cancelled) return
                setDetail(nextDetail)

                const dteDocumentID = nextDetail.dte?.dteDocumentID
                if (dteDocumentID) {
                    const document = await getDteDocumentPdf(dteDocumentID, nextDetail.storeID || sale.storeID)
                    if (cancelled) return

                    if (document.encoding === "url") {
                        setOfficialPdfUrl(document.content)
                    } else {
                        const binary = window.atob(document.content)
                        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
                        const blob = new Blob([bytes], { type: "application/pdf" })
                        objectUrl = URL.createObjectURL(blob)
                        setOfficialPdfBlob(blob)
                        setOfficialPdfUrl(objectUrl)
                    }
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError instanceof Error ? requestError.message : "No se pudo cargar el documento.")
                }
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }

        void loadDocument()

        return () => {
            cancelled = true
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [sale, retry])

    const expectsOfficialDocument = Boolean(detail?.dte?.dteDocumentID ?? sale?.dte?.dteDocumentID)
    const paperLabel = detail?.saleType === "FACTURA" ? "Carta" : detail?.saleType === "BOLETA" ? "Térmico 80 mm" : null

    return (
        <Dialog open={Boolean(sale)} onOpenChange={(open) => { if (!open) onClose() }}>
            <DialogContent className="flex h-[min(94vh,1100px)] w-[min(96vw,1100px)] max-w-none flex-col bg-white dark:bg-slate-900">
                <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-4 pr-12 text-left dark:border-slate-700">
                    <DialogTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-white">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Vista previa del documento de venta
                    </DialogTitle>
                    <DialogDescription>
                        {sale ? `Venta ${sale.dte?.FOLIO ?? sale.folio ?? sale.saleID.slice(0, 8)} · ${expectsOfficialDocument ? `Documento tributario oficial${paperLabel ? ` · Formato ${paperLabel}` : ""}` : "Documento generado con datos de la venta"}` : ""}
                    </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-auto bg-slate-200 p-3 dark:bg-slate-950 sm:p-6">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Cargando detalle de la venta...
                        </div>
                    ) : error ? (
                        <div className="mx-auto max-w-md rounded-lg bg-white p-6 text-center shadow-sm dark:bg-slate-900">
                            <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
                            <Button type="button" variant="outline" className="mt-4" onClick={() => setRetry((value) => value + 1)}>
                                <RotateCcw className="h-4 w-4" />
                                Reintentar
                            </Button>
                        </div>
                    ) : detail && officialPdfUrl ? (
                        <iframe
                            ref={officialPdfRef}
                            src={officialPdfUrl}
                            title={`DTE ${detail.dte?.FOLIO ?? detail.folio ?? detail.saleID}`}
                            className={`mx-auto h-full min-h-[650px] w-full border-0 bg-white shadow-xl ${detail.saleType === "BOLETA" ? "max-w-[480px]" : "max-w-[920px]"}`}
                        />
                    ) : detail && !expectsOfficialDocument ? (
                        <div ref={printRef}>
                            <SaleDocument sale={detail} />
                        </div>
                    ) : detail ? (
                        <div className="mx-auto max-w-md rounded-lg bg-white p-6 text-center shadow-sm dark:bg-slate-900">
                            <p className="text-sm text-rose-700 dark:text-rose-300">
                                El documento oficial no está disponible para vista previa.
                            </p>
                        </div>
                    ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-6 py-3 dark:border-slate-700">
                    <Button type="button" variant="outline" onClick={() => void handleDownload()} disabled={!detail || isLoading || isDownloading}>
                        {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        {isDownloading ? "Generando PDF..." : "Descargar PDF"}
                    </Button>
                    <Button type="button" onClick={handlePrint} disabled={!detail || isLoading || (expectsOfficialDocument && !officialPdfUrl)}>
                        <Printer className="h-4 w-4" />
                        Imprimir
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
