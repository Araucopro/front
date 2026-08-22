import { getSingleSale } from "@/actions/sales/getSales"
import { getStoreById } from "@/actions/stores/getStoreById"
import AnularVentaControl from "@/components/Caja/AnularVentaControl"
import ConvertSaleButton from "@/components/Caja/ConvertSaleButton"
import PrintSaleButton from "@/components/Caja/PrintSaleButton"
import SaleMainInfo from "@/components/Caja/SaleMainInfo"
import SingleSaleTable from "@/components/Caja/SingleSaleTable"
import FinancialSummary from "@/components/Invoices/FinancialSummary"
import StoreInfo from "@/components/Invoices/StoreInfo"
import { getAnulatedProducts } from "@/lib/getAnulatedProducts"
import { Receipt, ShoppingBag } from "lucide-react"
import Link from "next/link"

interface PropsSale {
    params: Promise<{
        saleID: string
    }>
    searchParams?: Promise<{ storeID?: string | string[] }>
}
export default async function SingleSalePage({ params, searchParams }: PropsSale) {
    const { saleID } = await params
    const resolvedSearchParams = await searchParams
    const rawStoreID = resolvedSearchParams?.storeID
    const storeID = Array.isArray(rawStoreID) ? rawStoreID[0] : rawStoreID

    if (!storeID) {
        return (
            <div className="mx-auto mt-12 max-w-lg rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-amber-950">
                <h1 className="text-lg font-bold">Selecciona una tienda para consultar la venta</h1>
                <p className="mt-2 text-sm">El backend requiere el contexto de tienda para mostrar este detalle.</p>
                <Link href="/home" className="mt-4 inline-block font-semibold text-blue-700 hover:underline">
                    Regresar a ventas
                </Link>
            </div>
        )
    }

    const sale = await getSingleSale(saleID, storeID)
    const resolvedStore = sale.Store?.storeID
        ? sale.Store
        : sale.storeID
          ? await getStoreById(sale.storeID).catch(() => sale.Store)
          : sale.Store
    const displaySale = { ...sale, Store: resolvedStore }
    const products = sale?.SaleProducts ?? []
    if (!sale) return null

    const nulledProducts = getAnulatedProducts(sale)
    const total = products.reduce((acc, act) => acc + act.quantitySold * Number(act.unitPrice), 0)
    const totalNulled = nulledProducts.reduce((acc, act) => acc + act.quantitySold * Number(act.unitPrice), 0)

    const cantidadTotalProductos = products.reduce((acc, act) => act.quantitySold + acc, 0)
    const fecha = new Date(sale.createdAt).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "America/Santiago",
    })

    const storeForInfo = {
        ...resolvedStore,
        address: `${resolvedStore.location ?? ""} ${resolvedStore.address ?? ""}`.trim() || resolvedStore.address,
    }

    const neto = (total - totalNulled) / 1.19
    const pdfHref = sale.dte?.PDF
        ? /^(https?:|data:)/.test(sale.dte.PDF)
            ? sale.dte.PDF
            : `data:application/pdf;base64,${sale.dte.PDF}`
        : null
    const xmlHref = sale.dte?.XML
        ? /^(https?:|data:)/.test(sale.dte.XML)
            ? sale.dte.XML
            : `data:application/xml;base64,${sale.dte.XML}`
        : null
    const isLegacySale = !sale.saleType && ["Pagado", "Pendiente", "Anulado"].includes(sale.status)

    return (
        <div className="bg-white min-h-screen dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-4">
            <div className="max-w-5xl mx-auto print-container">
                <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700 mb-6">
                    <Link href={sale.storeID ? `/home?storeID=${sale.storeID}` : "/home"}>
                        <button className="flex items-center gap-2 text-blue-700 dark:text-blue-300 hover:underline text-base font-medium">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-5 h-5"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                            Regresar a la lista de ventas
                        </button>
                    </Link>
                    <h1 className="flex items-center gap-2 text-2xl font-bold">
                        <Receipt className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        Detalles de la venta
                    </h1>
                </div>
                <div className="space-y-6 pt-6">
                    <StoreInfo store={storeForInfo} />
                    <SaleMainInfo
                        cantidadTotalProductos={cantidadTotalProductos}
                        fecha={fecha}
                        paymentType={sale.paymentType}
                        status={sale.status}
                        total={total - totalNulled}
                        saleType={sale.saleType}
                        folio={sale.dte?.FOLIO}
                    />
                    {sale.dte && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="font-semibold text-blue-950 dark:text-blue-100">Documento tributario</p>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        Estado: {sale.dte.STATUS || sale.status}
                                        {sale.dte.FOLIO ? ` · Folio ${sale.dte.FOLIO}` : ""}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {pdfHref && (
                                        <a
                                            href={pdfHref}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                                        >
                                            Ver PDF
                                        </a>
                                    )}
                                    {xmlHref && (
                                        <a
                                            href={xmlHref}
                                            download={`dte-${sale.dte.FOLIO ?? sale.saleID}.xml`}
                                            className="rounded-md border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 dark:text-blue-200 dark:hover:bg-blue-900"
                                        >
                                            Descargar XML
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {sale.saleType === "NOTA_VENTA" && sale.status !== "CONVERTIDA" && (
                        <ConvertSaleButton saleID={sale.saleID} storeID={sale.storeID || storeID} />
                    )}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="flex items-center gap-2 text-lg font-semibold">
                                <ShoppingBag className="w-5 h-5 text-green-600 dark:text-green-400" />
                                Productos
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <SingleSaleTable products={products} />
                        </div>
                    </div>
                    {nulledProducts.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-950 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="flex items-center gap-2 text-lg font-semibold">
                                    <ShoppingBag className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    Productos anulados
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <SingleSaleTable products={nulledProducts} />
                            </div>
                        </div>
                    )}
                    {sale.Return && (
                        <div className="bg-red-50 dark:bg-red-950 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="text-center">
                                    <p className="text-sm text-blue-600 dark:text-blue-300 mb-1">
                                        Esta venta fue anulada: {sale.Return.reason}
                                    </p>
                                    <p className="text-sm text-blue-600 dark:text-blue-300 mb-1">
                                        El día:{" "}
                                        {new Date(sale.Return.createdAt).toLocaleDateString("es-CL", {
                                            timeZone: "America/Santiago",
                                        })}{" "}
                                        a las:{" "}
                                        {new Date(sale.Return.createdAt).toLocaleTimeString("es-CL", {
                                            timeZone: "America/Santiago",
                                        })}
                                    </p>
                                    <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
                                        Observación: {sale.Return.additionalNotes}
                                    </p>
                                    <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
                                        Gestionado por: {sale.Return.User.name}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    <FinancialSummary total={neto} discount={0} />
                    <div className="flex flex-col md:flex-row gap-3 justify-end mt-6">
                        <PrintSaleButton sale={displaySale} />
                        {isLegacySale && <AnularVentaControl sale={displaySale} />}
                    </div>
                </div>
            </div>
        </div>
    )
}
