import { toPrice } from "@/utils/priceFormat"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { ISaleProduct } from "@/interfaces/sales/ISale"

interface SingleSaleTableProps {
    products: ISaleProduct[]
    tone?: "success" | "danger"
}

export default function SingleSaleTable({ products, tone = "success" }: SingleSaleTableProps) {
    const headerClassName =
        tone === "danger"
            ? "bg-rose-200/80 dark:bg-rose-950/70"
            : "bg-emerald-100/90 dark:bg-emerald-950/60"
    const rowClassName =
        tone === "danger"
            ? "border-rose-200 bg-rose-50/80 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30 dark:hover:bg-rose-950/50"
            : "border-emerald-100 bg-white/70 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40"
    const subtotalClassName =
        tone === "danger" ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"

    return (
        <Table>
            <TableHeader>
                <TableRow className={headerClassName}>
                    <TableHead>#</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Total Neto</TableHead>
                    <TableHead>Total con IVA</TableHead>
                    <TableHead align="center">Cantidad</TableHead>
                    <TableHead>Subtotal</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {products.map((p, i) => {
                    const unitPrice = Number(p.unitPrice)
                    const lineSubtotal = unitPrice * p.quantitySold
                    const label =
                        p.productName?.trim() ||
                        p.variation?.sku?.trim() ||
                        `${p.variation?.color ?? ""} ${p.variation?.size ?? ""}`.trim() ||
                        "Producto"
                    return (
                        <TableRow
                            key={p.saleItemID || p.saleProductID}
                            className={`transition-colors ${rowClassName}`}
                        >
                            <TableCell>{i + 1}</TableCell>
                            <TableCell>{label}</TableCell>
                            <TableCell>{toPrice(unitPrice / 1.19)}</TableCell>
                            <TableCell>{toPrice(unitPrice)}</TableCell>
                            <TableCell align="center">{p.quantitySold}</TableCell>
                            <TableCell className={`font-bold ${subtotalClassName}`}>
                                {toPrice(lineSubtotal)}
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    )
}
