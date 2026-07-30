"use client"

import { useState, useEffect, useCallback } from "react"
import { useTienda } from "@/stores/tienda.store"
import { getSales } from "@/actions/sales/getSales"
import { getResume } from "@/actions/totals/getResume"
import { getMetaMensual } from "@/actions/totals/getMetaMensual"
import { getAllProducts } from "@/actions/products/getAllProducts"
import { getAllCategories } from "@/actions/categories/getAllCategories"
import DateRangeTabs from "./DateRangeTabs"
import StatisticsGrid, { DashboardStat } from "./StatisticsGrid"
import SalesEvolutionChart, { SalesEvolutionPoint } from "./SalesEvolutionChart"
import WebRankingSection, { WebRankingItem } from "./WebRankingSection"
import { StoreRankingCard, GoalProgressCard, MayoristaStoreItem } from "./MayoristaSection"
import GaugeChartSection from "./GaugeChartSection"
import ProductRanking from "./ProductRanking"
import { MotionItem } from "@/components/Animations/motionItem"
import { IResume } from "@/interfaces/sales/ISalesResume"
import { ISaleResponse } from "@/interfaces/sales/ISale"
import { IProduct } from "@/interfaces/products/IProduct"
import { ICategory } from "@/interfaces/categories/ICategory"
import { getChileDateMeta, getChileYYYYMMDD } from "@/utils/chile-date"

const EMPTY_RESUME: IResume = {
    groupedByPaymentType: [],
    groupedByStatus: [],
    periodSummary: {
        today: { count: 0, total: 0 },
        yesterday: { count: 0, total: 0 },
        month: { count: 0, total: 0 },
    },
}

const CLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })

function getDefaultDateRange() {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const start = `01-01-${now.getFullYear()}`
    const end = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`
    return { start, end }
}

/** Parse DD-MM-YYYY → Date (midday UTC to avoid TZ issues) */
function parseDisplayDate(ddmmyyyy: string): Date | null {
    const parts = ddmmyyyy.split("-")
    if (parts.length !== 3) return null
    const [d, m, y] = parts.map(Number)
    if (!d || !m || !y || y < 2000) return null
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

function filterByDateRange(sales: ISaleResponse[], start: string, end: string): ISaleResponse[] {
    const from = parseDisplayDate(start)
    const to = parseDisplayDate(end)
    if (!from || !to) return sales
    const toMs = to.getTime() + 24 * 60 * 60 * 1000 - 1
    return sales.filter((s) => {
        const t = new Date(s.createdAt).getTime()
        return t >= from.getTime() && t <= toMs
    })
}

function classifyChannel(sale: ISaleResponse): "web" | "mayorista" | "presencial" {
    const role = ((sale.Store as any)?.role ?? "").toLowerCase()
    const sid = (sale.storeID ?? "").toLowerCase()

    // Canal web informado por las ventas del backend.
    if (sid === "web" || role === "web") return "web"

    // Canal Mayorista: tiendas propias (type === "central")
    const type = (sale.Store?.type ?? "").toLowerCase()
    if (type === "central") return "mayorista"

    return "presencial"
}

function buildStats(resume: IResume, filteredSales: ISaleResponse[]): DashboardStat[] {
    const periodTotal = filteredSales.filter((s) => s.status !== "Anulado").reduce((acc, s) => acc + s.total, 0)
    const periodCount = filteredSales.filter((s) => s.status !== "Anulado").length

    return [
        {
            id: "today",
            icon: "DollarSign",
            label: "Ventas Hoy",
            value: CLP.format(resume.periodSummary.today.total),
            color: "text-green-500",
        },
        {
            id: "today-count",
            icon: "ShoppingCart",
            label: "Transacciones Hoy",
            value: String(resume.periodSummary.today.count),
            color: "text-blue-500",
        },
        {
            id: "yesterday",
            icon: "TrendingUp",
            label: "Ventas Ayer",
            value: CLP.format(resume.periodSummary.yesterday.total),
            color: "text-orange-500",
        },
        {
            id: "month",
            icon: "FileText",
            label: "Ventas del Per\u00edodo",
            value: CLP.format(periodTotal),
            color: "text-purple-500",
        },
        {
            id: "month-count",
            icon: "Users",
            label: "Trans. del Per\u00edodo",
            value: String(periodCount),
            color: "text-pink-500",
        },
    ]
}

function buildEvolutionData(sales: ISaleResponse[]): {
    data: SalesEvolutionPoint[]
    mayoristaShare: number
    webShare: number
    webTotal: number
    mayoristaTotal: number
} {
    const now = new Date()
    const months: SalesEvolutionPoint[] = []
    let totalMayorista = 0
    let totalWeb = 0
    let grandTotal = 0

    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const year = d.getFullYear()
        const month = d.getMonth() // 0-based
        const mesLabel = d.toLocaleString("es-CL", { month: "short" })
        let presencial = 0
        let mayorista = 0
        let web = 0

        for (const sale of sales) {
            if (sale.status === "Anulado") continue
            const meta = getChileDateMeta(new Date(sale.createdAt))
            if (meta.year === year && meta.month === month) {
                const channel = classifyChannel(sale)
                if (channel === "web") web += sale.total
                else if (channel === "mayorista") mayorista += sale.total
                else presencial += sale.total
            }
        }

        totalMayorista += mayorista
        totalWeb += web
        grandTotal += presencial + mayorista + web
        months.push({ mes: mesLabel, presencial, mayorista, web })
    }

    const mayoristaShare = grandTotal > 0 ? Math.round((totalMayorista / grandTotal) * 100) : 0
    const webShare = grandTotal > 0 ? Math.round((totalWeb / grandTotal) * 100) : 0

    return { data: months, mayoristaShare, webShare, webTotal: totalWeb, mayoristaTotal: totalMayorista }
}

function buildWebRanking(
    sales: ISaleResponse[],
    products: IProduct[],
): { items: WebRankingItem[]; percentage: number } {
    const productMap = new Map(products.map((p) => [p.productID, p.name]))
    const totals = new Map<string, number>()
    let webTotal = 0
    let grandTotal = 0

    for (const sale of sales) {
        if (sale.status === "Anulado") continue
        grandTotal += sale.total
        if (classifyChannel(sale) !== "web") continue
        webTotal += sale.total
        for (const sp of sale.SaleProducts) {
            const name = productMap.get(sp.variation?.productID) ?? sp.variation?.sku ?? "Producto"
            totals.set(name, (totals.get(name) ?? 0) + (Number(sp.subtotal) || 0))
        }
    }

    const items = Array.from(totals.entries())
        .map(([categoria, valor]) => ({ categoria, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 6)

    const percentage = grandTotal > 0 ? Math.round((webTotal / grandTotal) * 100) : 0
    return { items, percentage }
}

function buildMayoristaData(
    sales: ISaleResponse[],
    goalTotal: number,
): { topStores: MayoristaStoreItem[]; salesTotal: number; goalTotal: number } {
    const storeTotals = new Map<string, number>()
    let salesTotal = 0

    for (const sale of sales) {
        if (sale.status === "Anulado") continue
        if (classifyChannel(sale) !== "mayorista") continue
        salesTotal += sale.total
        const name = sale.Store?.name ?? "Tienda"
        storeTotals.set(name, (storeTotals.get(name) ?? 0) + sale.total)
    }

    const topStores = Array.from(storeTotals.entries())
        .map(([nombre, ventas]) => ({ nombre, ventas }))
        .sort((a, b) => b.ventas - a.ventas)
        .slice(0, 6)

    return { topStores, salesTotal, goalTotal }
}

export default function ControlDashboardClient() {
    const { storeSelected } = useTienda()
    const [dateRange, setDateRange] = useState(getDefaultDateRange)
    const [activeTab, setActiveTab] = useState("detallado")

    const [resume, setResume] = useState<IResume>(EMPTY_RESUME)
    const [allSales, setAllSales] = useState<ISaleResponse[]>([])
    const [products, setProducts] = useState<IProduct[]>([])
    const [categories, setCategories] = useState<ICategory[]>([])
    const [goalTotal, setGoalTotal] = useState(0)
    const [loading, setLoading] = useState(false)

    const fetchData = useCallback(async () => {
        if (!storeSelected?.storeID) return
        setLoading(true)
        try {
            const todayStr = getChileYYYYMMDD(new Date())
            const [resumeData, salesData, productsData, categoriesData, metaData] = await Promise.all([
                getResume(storeSelected.storeID, todayStr),
                getSales(), // Sin filtro de tienda para análisis multi-canal
                getAllProducts(),
                getAllCategories(),
                getMetaMensual(storeSelected.storeID),
            ])
            const dbSales = Array.isArray(salesData) ? salesData : []
            setResume(resumeData ?? EMPTY_RESUME)
            setAllSales(dbSales)
            setProducts(Array.isArray(productsData) ? productsData : [])
            setCategories(Array.isArray(categoriesData) ? categoriesData : [])
            setGoalTotal(typeof metaData === "number" ? metaData : 0)
        } catch (e) {
            console.error("ControlDashboard: Error al cargar datos", e)
        } finally {
            setLoading(false)
        }
    }, [storeSelected?.storeID])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const filteredSales = filterByDateRange(allSales, dateRange.start, dateRange.end)

    const stats = buildStats(resume, filteredSales)
    const {
        data: evolutionData,
        mayoristaShare,
        webShare,
        webTotal,
        mayoristaTotal,
    } = buildEvolutionData(filteredSales)
    const { items: webItems, percentage: webPct } = buildWebRanking(filteredSales, products)
    const { topStores, salesTotal } = buildMayoristaData(filteredSales, goalTotal)

    if (!storeSelected) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500 dark:text-gray-400">Selecciona una tienda para ver el dashboard.</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="w-full px-3 md:px-6 py-4 space-y-5">
                {/* ── Filtros de fecha ── */}
                <DateRangeTabs
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-gray-500 dark:text-gray-400 animate-pulse">Cargando datos...</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* ── Fila 1: KPIs | Gauge | Ranking Categorías ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                            <MotionItem delay={1} className="lg:col-span-3">
                                <StatisticsGrid stats={stats} />
                            </MotionItem>

                            <MotionItem delay={2} className="lg:col-span-5">
                                <GaugeChartSection resume={resume} />
                            </MotionItem>

                            <MotionItem delay={3} className="lg:col-span-4">
                                <ProductRanking initialProducts={products} categories={categories} />
                            </MotionItem>
                        </div>

                        {/* ── Fila 2: Evolución 12 meses (ancho completo) ── */}
                        <MotionItem delay={4}>
                            <SalesEvolutionChart
                                data={evolutionData}
                                mayoristaShare={mayoristaShare}
                                webShare={webShare}
                                webTotal={webTotal}
                                mayoristaTotal={mayoristaTotal}
                            />
                        </MotionItem>

                        {/* ── Fila 3: Ranking Web | Tiendas | Meta ── */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <MotionItem delay={5}>
                                <WebRankingSection items={webItems} percentage={webPct} />
                            </MotionItem>

                            <MotionItem delay={6}>
                                <StoreRankingCard topStores={topStores} />
                            </MotionItem>

                            <MotionItem delay={7}>
                                <GoalProgressCard salesTotal={salesTotal} goalTotal={goalTotal} />
                            </MotionItem>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
