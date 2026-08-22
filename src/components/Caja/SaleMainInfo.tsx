import React from "react"

interface Props {
    cantidadTotalProductos: number
    fecha: string
    paymentType?: string
    status?: string
    total?: number
    saleType?: string
    folio?: number | null
}

const saleTypeLabels: Record<string, string> = {
    BOLETA: "Boleta electrónica",
    FACTURA: "Factura electrónica",
    NOTA_VENTA: "Nota de venta",
}

export default function SaleMainInfo({ cantidadTotalProductos, fecha, paymentType, status, saleType, folio }: Props) {
    return (
        <>
            {/* Información Principal */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Número de productos solicitados */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            N° Productos solicitados
                        </span>
                    </div>
                    <p className="text-lg font-semibold">{cantidadTotalProductos}</p>
                </div>

                {/* Fecha de emisión */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Fecha de emisión</span>
                    </div>
                    <p className="text-lg font-semibold">{fecha}</p>
                </div>

                {/* Tipo de pago */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tipo de Pago</span>
                    </div>
                    <p className="text-lg font-semibold">{paymentType || "N/A"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-slate-800">
                    <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Documento</p>
                    <p className="text-lg font-semibold">{saleType ? saleTypeLabels[saleType] ?? saleType : "Venta"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-slate-800">
                    <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Estado</p>
                    <p className="text-lg font-semibold">{status || "N/A"}</p>
                </div>
                {folio !== null && folio !== undefined && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-slate-800">
                        <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Folio DTE</p>
                        <p className="text-lg font-semibold">{folio}</p>
                    </div>
                )}
            </div>

            {/* Información adicional */}
        </>
    )
}
