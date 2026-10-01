import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import type { ISaleResponse } from "@/interfaces/sales/ISale"
import { getChileYYYYMMDD, isYYYYMMDD, toChileMiddayUTC } from "@/utils/chile-date"
import { toPrice } from "@/utils/priceFormat"
import { getSalePaymentBreakdown } from "@/utils/sale-payments"

const styles = StyleSheet.create({
    page: { padding: 38, fontSize: 9, fontFamily: "Helvetica", color: "#172033", backgroundColor: "#ffffff" },
    header: { flexDirection: "row", justifyContent: "space-between", gap: 25 },
    issuer: { width: "59%" },
    initials: { width: 90, padding: 8, marginBottom: 12, backgroundColor: "#f1f5f9", border: "1 solid #cbd5e1", color: "#64748b", fontSize: 17, fontFamily: "Helvetica-Bold", textAlign: "center" },
    issuerName: { fontSize: 15, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 5 },
    issuerLine: { marginBottom: 3, textTransform: "uppercase" },
    folioColumn: { width: "37%" },
    folioBox: { minHeight: 93, border: "2 solid #dc2626", padding: 9, alignItems: "center", justifyContent: "center" },
    folioLine: { textAlign: "center", fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 7 },
    folioType: { textAlign: "center", fontSize: 10, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 7 },
    issuerCity: { marginTop: 7, textAlign: "center", color: "#64748b" },
    receiver: { marginTop: 27, border: "1 solid #94a3b8", borderRadius: 5 },
    receiverRow: { flexDirection: "row", borderBottom: "1 solid #cbd5e1", minHeight: 20 },
    receiverRowLast: { flexDirection: "row", minHeight: 20 },
    receiverLabel: { width: 95, padding: 5, backgroundColor: "#e2e8f0", fontFamily: "Helvetica-Bold" },
    receiverValue: { flex: 1, padding: 5 },
    receiverLabelNarrow: { width: 81, padding: 5, backgroundColor: "#e2e8f0", fontFamily: "Helvetica-Bold" },
    receiverValueNarrow: { width: 115, padding: 5 },
    table: { marginTop: 20, border: "1 solid #94a3b8", borderRadius: 5 },
    tableTitle: { padding: 5, backgroundColor: "#e2e8f0", textAlign: "center", fontFamily: "Helvetica-Bold", borderBottom: "1 solid #94a3b8" },
    tableHead: { flexDirection: "row", backgroundColor: "#f1f5f9", borderBottom: "1 solid #cbd5e1", fontFamily: "Helvetica-Bold" },
    tableRow: { flexDirection: "row", borderBottom: "1 solid #e2e8f0", minHeight: 25 },
    numberCell: { width: 27, padding: 5, borderRight: "1 solid #e2e8f0" },
    descriptionCell: { flex: 1, padding: 5, borderRight: "1 solid #e2e8f0" },
    quantityCell: { width: 48, padding: 5, textAlign: "right", borderRight: "1 solid #e2e8f0" },
    moneyCell: { width: 69, padding: 5, textAlign: "right", borderRight: "1 solid #e2e8f0" },
    lastMoneyCell: { width: 69, padding: 5, textAlign: "right" },
    secondaryLine: { marginTop: 3, fontSize: 7, color: "#64748b" },
    bottom: { flexDirection: "row", justifyContent: "space-between", gap: 20, marginTop: 32 },
    info: { flex: 1, padding: 10, border: "1 solid #cbd5e1", borderRadius: 5, color: "#64748b" },
    infoTitle: { fontFamily: "Helvetica-Bold", color: "#334155", marginBottom: 5 },
    infoLine: { marginBottom: 3 },
    previewNotice: { marginTop: 7, color: "#92400e", fontFamily: "Helvetica-Bold" },
    totals: { width: 180, border: "1 solid #94a3b8", borderRadius: 5 },
    totalsTitle: { padding: 5, backgroundColor: "#e2e8f0", textAlign: "center", fontFamily: "Helvetica-Bold" },
    totalRow: { flexDirection: "row", justifyContent: "space-between", padding: 5, borderTop: "1 solid #cbd5e1" },
    totalRowFinal: { flexDirection: "row", justifyContent: "space-between", padding: 7, backgroundColor: "#f1f5f9", fontFamily: "Helvetica-Bold", borderTop: "1 solid #94a3b8" },
    footer: { marginTop: 24, textAlign: "center", color: "#94a3b8", fontSize: 8 },
})

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
    return Number.isNaN(createdAt.getTime())
        ? "Sin fecha"
        : dateFormatter.format(toChileMiddayUTC(getChileYYYYMMDD(createdAt)))
}

const formatMoney = (amount: number | string) => `$${toPrice(Number(amount))}`

function TotalRow({ label, amount, final = false }: { label: string; amount: number; final?: boolean }) {
    return (
        <View style={final ? styles.totalRowFinal : styles.totalRow}>
            <Text>{label}</Text>
            <Text>{formatMoney(amount)}</Text>
        </View>
    )
}

export function SalePreviewPdfDocument({ sale }: { sale: ISaleResponse }) {
    const issuer = sale.Store
    const receiver = sale.receiver
    const folio = sale.dte?.FOLIO ?? sale.folio
    const payments = getSalePaymentBreakdown(sale)

    return (
        <Document title={`Vista previa de venta ${folio ?? sale.saleID}`} author="ARAUCO">
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View style={styles.issuer}>
                        <Text style={styles.initials}>{issuer?.name?.slice(0, 2).toUpperCase() || "AR"}</Text>
                        <Text style={styles.issuerName}>{issuer?.businessName || issuer?.name || "Emisor sin datos"}</Text>
                        {issuer?.giro && <Text style={styles.issuerLine}>Giro: {issuer.giro}</Text>}
                        {(issuer?.address || issuer?.city) && (
                            <Text style={styles.issuerLine}>{[issuer.address, issuer.city].filter(Boolean).join(", ")}</Text>
                        )}
                        {issuer?.phone && <Text>Teléfono: {issuer.phone}</Text>}
                    </View>
                    <View style={styles.folioColumn}>
                        <View style={styles.folioBox}>
                            <Text style={styles.folioLine}>RUT: {issuer?.rut || "Sin RUT"}</Text>
                            <Text style={styles.folioType}>
                                {documentLabels[sale.saleType ?? ""] ?? "Documento de venta"}
                            </Text>
                            <Text style={styles.folioLine}>{folio ? `N° ${folio}` : "Sin folio"}</Text>
                        </View>
                        <Text style={styles.issuerCity}>{issuer?.city || "Documento de venta"}</Text>
                    </View>
                </View>

                <View style={styles.receiver}>
                    <View style={styles.receiverRow}>
                        <Text style={styles.receiverLabel}>Señor(es)</Text>
                        <Text style={styles.receiverValue}>{receiver?.name || "Cliente general"}</Text>
                    </View>
                    <View style={styles.receiverRow}>
                        <Text style={styles.receiverLabel}>RUT</Text>
                        <Text style={styles.receiverValue}>{receiver?.rut || "—"}</Text>
                        <Text style={styles.receiverLabelNarrow}>Fecha emisión</Text>
                        <Text style={styles.receiverValueNarrow}>{formatIssueDate(sale)}</Text>
                    </View>
                    <View style={styles.receiverRow}>
                        <Text style={styles.receiverLabel}>Dirección</Text>
                        <Text style={styles.receiverValue}>{receiver?.address || "—"}</Text>
                        <Text style={styles.receiverLabelNarrow}>Comuna</Text>
                        <Text style={styles.receiverValueNarrow}>{receiver?.city || "—"}</Text>
                    </View>
                    <View style={styles.receiverRowLast}>
                        <Text style={styles.receiverLabel}>Contacto</Text>
                        <Text style={styles.receiverValue}>{receiver?.email || "—"}</Text>
                    </View>
                </View>

                <View style={styles.table}>
                    <Text style={styles.tableTitle}>DETALLES</Text>
                    <View style={styles.tableHead}>
                        <Text style={styles.numberCell}>N°</Text>
                        <Text style={styles.descriptionCell}>Descripción</Text>
                        <Text style={styles.quantityCell}>Cant.</Text>
                        <Text style={styles.moneyCell}>Prec. unit.</Text>
                        <Text style={styles.lastMoneyCell}>Total</Text>
                    </View>
                    {sale.SaleProducts.length > 0 ? (
                        sale.SaleProducts.map((item, index) => (
                            <View key={item.saleItemID || `${item.variationID}-${index}`} style={styles.tableRow} wrap={false}>
                                <Text style={styles.numberCell}>{index + 1}</Text>
                                <View style={styles.descriptionCell}>
                                    <Text>{item.productName || "Producto sin nombre"}</Text>
                                    {(item.variation.sku || item.variation.size) && (
                                        <Text style={styles.secondaryLine}>
                                            {[item.variation.sku, item.variation.size].filter(Boolean).join(" · ")}
                                        </Text>
                                    )}
                                </View>
                                <Text style={styles.quantityCell}>{item.quantitySold}</Text>
                                <Text style={styles.moneyCell}>{formatMoney(item.unitPrice)}</Text>
                                <Text style={styles.lastMoneyCell}>{formatMoney(item.subtotal)}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={{ padding: 12, textAlign: "center", color: "#64748b" }}>
                            El detalle de productos no está disponible en esta venta.
                        </Text>
                    )}
                </View>

                <View style={styles.bottom} wrap={false}>
                    <View style={styles.info}>
                        <Text style={styles.infoTitle}>INFORMACIÓN</Text>
                        <Text style={styles.infoLine}>MEDIOS DE PAGO</Text>
                        {payments.map((payment, index) => (
                            <Text key={`${payment.label}-${index}`} style={styles.infoLine}>
                                {payment.label}: {formatMoney(payment.amount)}
                            </Text>
                        ))}
                        <Text style={styles.infoLine}>ID de venta: {sale.saleID}</Text>
                        <Text style={styles.previewNotice}>
                            Vista previa informativa. No sustituye el PDF oficial ni el timbre electrónico del SII.
                        </Text>
                    </View>
                    <View style={styles.totals}>
                        <Text style={styles.totalsTitle}>TOTALES</Text>
                        {sale.subtotal !== undefined && <TotalRow label="Subtotal" amount={sale.subtotal} />}
                        {sale.discount !== undefined && sale.discount > 0 && (
                            <TotalRow label="Descuento" amount={-sale.discount} />
                        )}
                        {sale.netTotal !== undefined && <TotalRow label="Neto" amount={sale.netTotal} />}
                        {sale.taxTotal !== undefined && <TotalRow label="IVA" amount={sale.taxTotal} />}
                        <TotalRow label="Total" amount={sale.total} final />
                    </View>
                </View>
                <Text style={styles.footer}>Vista previa informativa</Text>
            </Page>
        </Document>
    )
}
