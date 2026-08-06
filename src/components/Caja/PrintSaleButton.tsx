"use client"

import { useCallback } from "react"
import { ISaleResponse } from "@/interfaces/sales/ISale"
import { Button } from "@/components//ui/button"
import { toPrice } from "@/utils/priceFormat"

export default function PrintSaleButton({ sale }: { sale: ISaleResponse }) {
    const handlePrint = useCallback(() => {
        if (typeof window === "undefined") return

        if (sale.dte?.PDF) {
            const pdfUrl = /^(https?:|data:)/.test(sale.dte.PDF)
                ? sale.dte.PDF
                : `data:application/pdf;base64,${sale.dte.PDF}`
            window.open(pdfUrl, "_blank", "noopener,noreferrer")
            return
        }

        const printWindow = window.open("", "_blank", "width=600,height=800")
        if (!printWindow) return

        const html = `
      <html>
        <head>
          <title>Boleta de venta</title>
          <style>
            body { font-family: sans-serif; padding: 16px; }
            h2 { margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            td, th { border: 1px solid #000; padding: 4px; font-size: 14px; }
            .total { text-align: right; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>${sale.Store.name}</h2>
          <div>Código interno: ${sale.saleID}</div>
          <div>Fecha: ${new Date(sale.createdAt).toLocaleString()}</div>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${sale.SaleProducts.map(
                  (p) => `
                <tr>
                  <td>${p.variation?.sku ?? ""}</td>
                  <td>${p.variation?.sku ?? "Producto"}${p.variation?.size ? ` (${p.variation.size})` : ""}</td>
                  <td>${p.quantitySold}</td>
                  <td>${toPrice(Number(p.unitPrice))}</td>
                  <td>${toPrice(Number(p.subtotal ?? Number(p.unitPrice) * p.quantitySold))}</td>
                </tr>
              `,
              ).join("")}
            </tbody>
          </table>
          <div class="total">Total: ${toPrice(Number(sale.total))}</div>
          <script>
          window.onload = function() {
            window.print();
            setTimeout(() => window.close(), 500);
            // quitar el close si quieres que el usuario decida cuándo cerrar
          }
        </script>
        </body>
      </html>
    `

        printWindow.document.open()
        printWindow.document.write(html)
        setTimeout(() => printWindow.document.close(), 500)
    }, [sale])

    return (
        <Button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
            onClick={handlePrint}
        >
            {sale.dte?.PDF ? "Ver documento oficial" : "Imprimir"}
        </Button>
    )
}
