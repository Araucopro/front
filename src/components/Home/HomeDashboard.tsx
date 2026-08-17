import { Suspense } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ChartBarIcon } from "lucide-react"
import FilterControls from "@/components/Caja/FilterControls"
import DailyResumeCards from "@/components/Caja/DailyResumeCards"
import SalesAndResumeSkeleton from "@/components/skeletons/SalesAndResume"
import ResumeLeftSideChart from "@/components/Caja/ResumeLeftSideChart"
import TotalSalesResumeGraph from "@/components/Caja/TotalSalesResumeGraph"
import ResumeRightSideChart from "@/components/Caja/ResumeRightSideChart"
import { SaleForm } from "@/components/CreateSale/SaleForm"
import SalesTable from "@/components/Caja/SalesTable"
import { IStore } from "@/interfaces/stores/IStore"
import { IResume } from "@/interfaces/sales/ISalesResume"
import { ISaleResponse } from "@/interfaces/sales/ISale"
import { IPurchaseOrder } from "@/interfaces/orders/IPurchaseOrder"
import { IProduct } from "@/interfaces/products/IProduct"
import { salesToBankDepositSummary, salesToResume } from "@/utils/saleToResume"

type HomeDashboardProps = {
    stores: IStore[]
    resume: IResume
    allSalesForResume: ISaleResponse[]
    items: Array<ISaleResponse | (IPurchaseOrder & { isOrder: true })>
    allProducts: IProduct[]
    dateRef: Date
    date: string
}

export default function HomeDashboard({
    stores,
    resume,
    allSalesForResume,
    items,
    allProducts,
    dateRef,
    date,
}: HomeDashboardProps) {
    const monthLabel = new Intl.DateTimeFormat("es-CL", {
        month: "long",
        timeZone: "America/Santiago",
    }).format(dateRef)
    const salesResume = salesToResume(allSalesForResume, dateRef)
    const bankDepositSummary = salesToBankDepositSummary(allSalesForResume, dateRef)

    return (
        <div className="space-y-4 px-4 py-3 sm:px-6 md:px-8">
            <FilterControls stores={stores} variant="channel" />

            <Suspense fallback={<SalesAndResumeSkeleton />}>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem
                        value="month-progress"
                        className="overflow-hidden rounded-lg border border-slate-200 bg-white px-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                        <AccordionTrigger className="py-3 text-sm font-bold hover:no-underline">
                            <div className="flex items-center gap-3">
                                <span className="text-xs">▶</span>
                                <span>Ver avances del mes</span>
                            </div>
                            <span className="mr-4 hidden text-xs font-medium text-slate-500 sm:inline">
                                Ver resumen
                            </span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pb-4 pt-1">
                            <DailyResumeCards salesResume={salesResume} />
                            <div className="space-y-3">
                                <h2 className="px-1 text-base font-semibold text-slate-800 dark:text-slate-100">
                                    Desempeño del mes de {monthLabel}
                                </h2>
                                <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-sm font-semibold dark:border-slate-700">
                                    <ChartBarIcon className="h-5 w-5" />
                                    <span>Panel de estadísticas globales</span>
                                </div>
                                <div className="block space-y-4 lg:grid lg:grid-cols-3 lg:items-start lg:gap-4 lg:space-y-0">
                                    <ResumeLeftSideChart saleResume={resume} />
                                    <TotalSalesResumeGraph resume={resume} date={date} />
                                    <ResumeRightSideChart
                                        saleResume={resume}
                                        bankDepositSummary={bankDepositSummary}
                                    />
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </Suspense>

            <section className="space-y-3">
                <div className="flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    <span>✦</span>
                    <span>Punto de venta</span>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <SaleForm initialProducts={allProducts} />
                </div>
            </section>

            <section className="space-y-3">
                <div className="flex items-center gap-3 py-2">
                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Diario de ventas
                    </span>
                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>
                <SalesTable items={items} />
            </section>
        </div>
    )
}
