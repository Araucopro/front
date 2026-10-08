"use client"

import { useCallback, useRef, useState } from "react"
import { SaleForm } from "@/components/CreateSale/SaleForm"
import SalesTable from "@/components/Caja/SalesTable"
import type { IProduct } from "@/interfaces/products/IProduct"
import type { ISaleResponse } from "@/interfaces/sales/ISale"
import type { IPurchaseOrder } from "@/interfaces/orders/IPurchaseOrder"
import type { IStore } from "@/interfaces/stores/IStore"

type SalesWorkspaceProps = {
    initialProducts: IProduct[]
    storeSettings?: IStore
    items: Array<ISaleResponse | IPurchaseOrder>
}

export default function SalesWorkspace({ initialProducts, storeSettings, items }: SalesWorkspaceProps) {
    const [highlightedSaleID, setHighlightedSaleID] = useState<string | null>(null)
    const diaryRef = useRef<HTMLElement>(null)
    const finishSaleHighlight = useCallback(() => setHighlightedSaleID(null), [])

    const handleSaleCreated = (saleID: string) => {
        setHighlightedSaleID(saleID || null)
        diaryRef.current?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
            block: "start",
        })
    }

    return (
        <>
            <section className="space-y-3">
                <div className="flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    <span>✦</span>
                    <span>Punto de venta</span>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <SaleForm
                        initialProducts={initialProducts}
                        storeSettings={storeSettings}
                        onSaleCreated={handleSaleCreated}
                    />
                </div>
            </section>

            <section ref={diaryRef} className="scroll-mt-4 space-y-3">
                <div className="flex items-center gap-3 py-2">
                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Diario de ventas
                    </span>
                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>
                <SalesTable
                    items={items}
                    highlightedSaleID={highlightedSaleID}
                    onSaleHighlightComplete={finishSaleHighlight}
                />
            </section>
        </>
    )
}
