"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileCheck2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { convertSale } from "@/actions/sales/convertSale"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ElectronicDocumentType } from "@/interfaces/sales/ISale"

export default function ConvertSaleButton({ saleID, storeID }: { saleID: string; storeID: string }) {
    const router = useRouter()
    const [documentType, setDocumentType] = useState<ElectronicDocumentType>("BOLETA")
    const [loading, setLoading] = useState(false)

    const handleConvert = async () => {
        try {
            setLoading(true)
            const result = await convertSale(saleID, storeID, documentType)
            const folio = result.dte?.FOLIO ? ` Folio ${result.dte.FOLIO}.` : ""
            toast.success(`Nota convertida a ${documentType === "BOLETA" ? "boleta" : "factura"}.${folio}`)
            router.refresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo convertir la nota de venta")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">Convertir nota de venta</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    La conversión emite el DTE sin volver a descontar stock.
                </p>
            </div>
            <Select value={documentType} onValueChange={(value: ElectronicDocumentType) => setDocumentType(value)}>
                <SelectTrigger className="w-full bg-white dark:bg-slate-900 sm:w-36">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="BOLETA">Boleta</SelectItem>
                    <SelectItem value="FACTURA">Factura</SelectItem>
                </SelectContent>
            </Select>
            <Button onClick={handleConvert} disabled={loading} className="bg-emerald-700 hover:bg-emerald-800">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                {loading ? "Emitiendo..." : "Convertir"}
            </Button>
        </div>
    )
}
