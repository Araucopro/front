"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
    FaBars,
    FaBolt,
    FaBuilding,
    FaChartBar,
    FaChevronDown,
    FaCog,
    FaFileInvoiceDollar,
    FaHome,
    FaMoneyBillWave,
    FaSun,
    FaTimes,
    FaUsers,
} from "react-icons/fa"
import type { IconType } from "react-icons"
import { logout as logoutSession } from "@/actions/auth/authActions"
import { useMasterAuth } from "@/stores/master.store"
import { toast } from "sonner"
import TenantManagement from "@/components/Master/TenantManagement"
import type { ITenantListResponse } from "@/interfaces/master/ITenant"

interface MasterDashboardProps {
    initialTenants?: ITenantListResponse
    initialError?: string
}

interface MasterNavigationGroup {
    label: string
    items: Array<{
        label: string
        icon: IconType
        active?: boolean
    }>
}

const navigationGroups: MasterNavigationGroup[] = [
    {
        label: "Resumen",
        items: [{ label: "Escritorio", icon: FaHome, active: true }],
    },
    {
        label: "Módulos",
        items: [
            { label: "Egresos", icon: FaMoneyBillWave },
            { label: "Estado de Resultados", icon: FaChartBar },
        ],
    },
    {
        label: "Gestión",
        items: [
            { label: "Clientes", icon: FaBuilding },
            { label: "Facturación Haulmer", icon: FaFileInvoiceDollar },
            { label: "RRHH", icon: FaUsers },
            { label: "Configuración", icon: FaCog },
        ],
    },
]

const metrics = [
    {
        label: "Negocios registrados",
        value: "6",
        detail: "tenants en la plataforma",
        valueClassName: "text-[#122238]",
    },
    {
        label: "Usuarios totales",
        value: "25",
        detail: "en todos los negocios",
        valueClassName: "text-[#122238]",
    },
    {
        label: "Ventas de portafolio",
        value: "$1.413.500.000.-",
        detail: "CLP en todos los tenants",
        valueClassName: "text-[#12623c]",
    },
    {
        label: "Comisión neta AraucoPro",
        value: "$11.594.010.-",
        detail: "0,74% ($10.459.900) + boletas ($1.134.110)",
        valueClassName: "text-[#b95509]",
    },
]

const monthlySales = [
    { month: "Ene 26", placeholder: true },
    { month: "Feb 26", placeholder: true },
    { month: "Mar 26", placeholder: true },
    { month: "Abr 26", placeholder: true },
    { month: "May 26", placeholder: true },
    { month: "Jun 26", placeholder: true },
    { month: "Jul 26", placeholder: true },
    { month: "Ago 26", sales: "$2.0M", income: "$245.014", height: 70 },
    { month: "Sep 26", sales: "$2.1M", income: "$262.014", height: 76 },
    { month: "Oct 26", sales: "$2.3M", income: "$279.501", height: 82 },
    { month: "Nov 26", sales: "$2.5M", income: "$307.014", height: 90 },
    { month: "Dic 26", sales: "$2.6M", income: "$320.014", height: 94 },
]

function MasterSidebar({
    mobileOpen,
    onClose,
    onAccess,
}: {
    mobileOpen: boolean
    onClose: () => void
    onAccess: () => void
}) {
    const [isLightMode, setIsLightMode] = useState(true)

    const handleMockNavigation = (label: string) => {
        onClose()
        if (label !== "Escritorio") {
            toast.info(`${label} se implementará en una siguiente etapa`)
        }
    }

    return (
        <>
            {mobileOpen && <button aria-label="Cerrar menú" className="fixed inset-0 z-30 bg-black/45 lg:hidden" onClick={onClose} />}

            <aside
                className={`fixed inset-y-0 left-0 z-40 mt-11 flex w-[186px] flex-col bg-[#102438] text-[#ced7e1] transition-transform duration-200 lg:translate-x-0 ${
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="px-2 pt-4">
                    <button
                        onClick={onAccess}
                        className="flex w-full items-center justify-between rounded-md bg-[#20364c] px-2.5 py-2 text-[9px] uppercase tracking-[0.18em] text-white"
                    >
                        Mis accesos
                        <FaChevronDown className="h-2 w-2" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto pt-2">
                    {navigationGroups.map((group) => (
                        <div key={group.label} className="border-b border-white/[0.07] px-2 pb-3 pt-1">
                            <p className="px-1 py-2 text-[9px] uppercase tracking-[0.16em] text-[#8493a4]">{group.label}</p>
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const Icon = item.icon
                                    return (
                                        <button
                                            key={item.label}
                                            onClick={() => handleMockNavigation(item.label)}
                                            className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[12px] transition-colors ${
                                                item.active
                                                    ? "bg-[#35495f] text-white"
                                                    : "text-[#c2ccd6] hover:bg-white/[0.07] hover:text-white"
                                            }`}
                                        >
                                            <Icon className="h-3.5 w-3.5 text-[#b9c7d3]" />
                                            {item.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="border-t border-white/[0.07] p-2">
                    <button
                        onClick={() => setIsLightMode((current) => !current)}
                        className="flex w-full items-center gap-3 rounded-md bg-[#20364c] px-3 py-2.5 text-[11px] text-white"
                    >
                        <FaSun className="h-3.5 w-3.5 text-yellow-300" />
                        <span className="flex-1 text-left">{isLightMode ? "Modo Claro" : "Modo Oscuro"}</span>
                        <span className={`relative h-4 w-8 rounded-full ${isLightMode ? "bg-[#75889c]" : "bg-[#0b1724]"}`}>
                            <span
                                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                                    isLightMode ? "translate-x-0.5" : "translate-x-[18px]"
                                }`}
                            />
                        </span>
                    </button>
                </div>
            </aside>
        </>
    )
}

export default function MasterDashboard({ initialTenants, initialError }: MasterDashboardProps) {
    const router = useRouter()
    const { masterUser, clearMasterUser } = useMasterAuth()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [tenantTotal, setTenantTotal] = useState<number | null>(initialTenants?.total ?? null)

    const handleLogout = async () => {
        if (isLoggingOut) return

        try {
            setIsLoggingOut(true)
            await logoutSession()
            clearMasterUser()
            router.replace("/login")
        } finally {
            setIsLoggingOut(false)
        }
    }

    return (
        <div className="min-h-svh bg-[#f0f1f4] text-[#122238]">
            <header className="fixed inset-x-0 top-0 z-50 flex h-11 items-center justify-between bg-[#102438] px-3 text-white">
                <div className="flex items-center gap-2.5">
                    <button
                        aria-label="Abrir menú"
                        onClick={() => setMobileOpen(true)}
                        className="rounded-md p-1.5 hover:bg-white/10 lg:hidden"
                    >
                        <FaBars className="h-4 w-4" />
                    </button>

                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#153f2c]">
                        <FaBolt className="h-3.5 w-3.5 text-yellow-300" />
                    </div>
                    <div className="text-[13px] font-bold tracking-wide">
                        Arauco<span className="text-[#40d47e]">Pro</span>
                    </div>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] tracking-wide text-[#dfe7ee]">
                        Master session
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <span className="hidden max-w-[320px] truncate text-[10px] tracking-wide text-[#aebac7] sm:block">
                        {masterUser?.role === "SUPER_ADMIN" ? "Super Admin" : masterUser?.role || "Master"} ·{" "}
                        {masterUser?.email || "Sesión master"}
                    </span>
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-semibold hover:bg-white/15 disabled:opacity-60"
                    >
                        {isLoggingOut ? "Cerrando..." : "Cerrar sesión"}
                    </button>
                </div>
            </header>

            <MasterSidebar
                mobileOpen={mobileOpen}
                onClose={() => setMobileOpen(false)}
                onAccess={() => router.push("/access")}
            />

            <main className="min-h-svh px-4 pb-8 pt-[70px] lg:ml-[186px] lg:px-7">
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {metrics.map((metric, index) => (
                        <article
                            key={metric.label}
                            className="min-h-[122px] rounded-[13px] border border-[#dfe2e7] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(16,36,56,0.02)]"
                        >
                            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#758296]">
                                {metric.label}
                            </p>
                            <p className={`mt-3 text-[26px] font-extrabold leading-none tracking-tight ${metric.valueClassName}`}>
                                {index === 0 ? tenantTotal ?? "—" : metric.value}
                            </p>
                            <p className="mt-3 text-[10px] text-[#697587]">{metric.detail}</p>
                        </article>
                    ))}
                </section>

                <section className="mt-6 rounded-[13px] border border-[#dfe2e7] bg-white px-4 py-5 sm:px-6">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                        <div>
                            <h1 className="text-sm font-extrabold">Evolución mensual de Ventas Brutas</h1>
                            <p className="mt-1 text-[10px] tracking-wide text-[#8792a2]">
                                Una barra por mes del período elegido. Franja naranja = ingreso neto AraucoPro.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <select
                                aria-label="Filtrar por negocio"
                                defaultValue="all"
                                className="h-8 rounded-lg border border-[#dfe3e8] bg-[#f8f9fb] px-3 text-[10px] outline-none"
                            >
                                <option value="all">Todos los negocios</option>
                            </select>
                            <select
                                aria-label="Seleccionar período"
                                defaultValue="2026"
                                className="h-8 rounded-lg border border-[#dfe3e8] bg-[#f8f9fb] px-3 text-[10px] font-semibold outline-none"
                            >
                                <option value="2026">Presente año (2026)</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6 overflow-x-auto pb-1">
                        <div className="relative min-w-[850px] pl-10">
                            <span className="absolute left-0 top-11 text-[9px] text-[#8c98a7]">$320M</span>
                            <span className="absolute bottom-7 left-6 text-[9px] text-[#8c98a7]">$0</span>
                            <div className="grid h-[200px] grid-cols-12 gap-5">
                                {monthlySales.map((item) => (
                                    <div key={item.month} className="flex min-w-0 flex-col items-center justify-end">
                                        <div className="mb-1 h-8 text-center">
                                            {!item.placeholder && (
                                                <>
                                                    <p className="text-[8px] font-bold text-[#ed5b12]">{item.sales}</p>
                                                    <p className="text-[7px] text-[#667487]">{item.income}</p>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex h-[145px] w-full items-end justify-center">
                                            <div
                                                className={
                                                    item.placeholder
                                                        ? "h-full w-[47px] rounded-t bg-[#eeeff2]"
                                                        : "w-[47px] border-t-2 border-[#f47422] bg-[#16a34a]"
                                                }
                                                style={item.placeholder ? undefined : { height: `${item.height}%` }}
                                            />
                                        </div>
                                        <p className={`mt-2 text-[9px] ${item.month === "Dic 26" ? "font-bold text-[#101b2b]" : "text-[#7d8998]"}`}>
                                            {item.month}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 pl-6 text-[9px] text-[#5f6c7b]">
                        <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm bg-[#16a34a]" />
                            Venta bruta agregada (todos los negocios)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm bg-[#f47422]" />
                            Ingreso neto AraucoPro (0,74% + $19/boleta)
                        </span>
                    </div>
                </section>

                <TenantManagement
                    initialTenants={initialTenants}
                    initialError={initialError}
                    onTotalChange={setTenantTotal}
                />
            </main>

            {mobileOpen && (
                <button
                    aria-label="Cerrar navegación"
                    onClick={() => setMobileOpen(false)}
                    className="fixed left-[145px] top-12 z-50 rounded-md bg-[#20364c] p-2 text-white lg:hidden"
                >
                    <FaTimes className="h-4 w-4" />
                </button>
            )}
        </div>
    )
}
