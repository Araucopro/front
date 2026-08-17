"use client"

import React, { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { FaBars, FaMoon, FaSun, FaTimes } from "react-icons/fa"
import { ChevronDown, LoaderCircle } from "lucide-react"
import { Collapsible } from "@/components/Animations/Collapsible"
import { MotionItem } from "@/components/Animations/motionItem"
import { SidebarTransition } from "@/components/Animations/SidebarTransition"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import useDarkMode from "@/hooks/useDarkMode"
import useMobileScreen from "@/hooks/useMobileScreen"
import useQueryParams from "@/hooks/useQueryParams"
import { Role } from "@/lib/userRoles"
import { useTienda } from "@/stores/tienda.store"
import { useAuth } from "@/stores/user.store"
import { navItems } from "@/utils/navItems"

type SidebarSubItem = {
    label: string
    route?: string
    icon?: React.ComponentType<{ className?: string }>
}

type SidebarItem = {
    label: string
    route?: string
    icon: React.ComponentType<{ className?: string }>
    subItems?: SidebarSubItem[]
}

const splitRoute = (route: string) => {
    const [path, query = ""] = route.split("?")
    return { path, query }
}

export default function Sidebar() {
    const router = useRouter()
    const pathname = usePathname()
    const { searchParams, createQueryParam } = useQueryParams()
    const searchParamsKey = searchParams.toString()

    const { user } = useAuth()
    const { storeSelected } = useTienda()
    const { isMobile, isMobileOpen, setIsMobileOpen } = useMobileScreen()
    const { isDarkMode, setIsDarkMode } = useDarkMode()

    const [isCollapsed, setIsCollapsed] = useState(false)
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
    const [pendingRoute, setPendingRoute] = useState<string | null>(null)

    useEffect(() => {
        setPendingRoute(null)
    }, [pathname, searchParamsKey])

    useEffect(() => {
        const storeID = searchParams.get("storeID")
        if (!storeID && storeSelected) {
            router.push(`${pathname}?${createQueryParam("storeID", storeSelected.storeID)}`)
        }
    }, [createQueryParam, pathname, router, searchParams, storeSelected])

    const filteredNavItems = useMemo<SidebarItem[]>(() => {
        if (!user) return []

        const items = navItems as SidebarItem[]

        if (user.role === Role.Vendedor) {
            return items.filter(
                (item) =>
                    item.label !== "UTI" && item.label !== "Estado de Resultados" && item.label !== "Control de Mando",
            )
        }

        if (user.role === Role.Consignado) {
            return items.filter(
                (item) =>
                    item.label !== "Caja" &&
                    item.label !== "Inventario" &&
                    item.label !== "UTI" &&
                    item.label !== "Control de Mando" &&
                    item.label !== "Estado de Resultados",
            )
        }

        if (user.role === Role.Tercero) {
            const renamedItems = items.map((item) => {
                if (item.label !== "Comercial" || !item.subItems) return item

                return {
                    ...item,
                    subItems: item.subItems.map((sub) => (sub.label === "Crear OC" ? { ...sub, label: "Comprar" } : sub)),
                }
            })

            return renamedItems.filter((item) => item.label === "Inventario" || item.label === "Comercial")
        }

        return items
    }, [user])

    const shouldShowCollapsed = !isMobile && isCollapsed

    const isRouteActive = (route?: string) => {
        if (!route || route === "#") return false

        const { path, query } = splitRoute(route)
        if (pathname !== path) return false

        const routeParams = new URLSearchParams(query)
        for (const [key, value] of routeParams.entries()) {
            if (key !== "storeID" && searchParams.get(key) !== value) return false
        }

        return true
    }

    const buildTargetRoute = (route: string) => {
        const { path, query } = splitRoute(route)
        const params = new URLSearchParams(query)

        if (storeSelected?.storeID) {
            params.set("storeID", storeSelected.storeID)
        }

        const targetQuery = params.toString()
        return targetQuery ? `${path}?${targetQuery}` : path
    }

    const handleNavClick = (route?: string) => {
        if (!route || route === "#") return

        setPendingRoute(route)
        router.push(buildTargetRoute(route))

        if (isMobile) {
            setIsMobileOpen(false)
        }
    }

    const toggleSection = (sectionId: string) => {
        setOpenSections((prev) => ({
            ...prev,
            [sectionId]: !prev[sectionId],
        }))
    }

    const PendingOverlay = () => (
        <motion.span
            aria-hidden="true"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-y-0 left-0 w-full bg-white/40 dark:bg-white/10"
        />
    )

    const MobileOverlay = () => (
        <div
            className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden ${
                isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={() => setIsMobileOpen(false)}
        />
    )

    const MobileMenuButton = () => (
        <button
            title="Abrir menu"
            onClick={() => setIsMobileOpen(true)}
            className="fixed left-4 top-4 z-50 rounded-lg border border-slate-200 bg-white p-2 shadow-lg lg:hidden dark:border-slate-800 dark:bg-slate-900"
        >
            <FaBars size={20} className="text-slate-700 dark:text-slate-200" />
        </button>
    )

    const renderSubItem = (sub: SidebarSubItem) => {
        const Icon = sub.icon
        const isSubActive = isRouteActive(sub.route)
        const isSubPending = pendingRoute === sub.route

        return (
            <button
                key={sub.label}
                onClick={() => handleNavClick(sub.route)}
                disabled={isSubPending}
                className={`relative flex h-10 w-full items-center gap-3 overflow-hidden px-6 pl-12 text-left text-[13px] transition-colors ${
                    isSubPending
                        ? "cursor-progress bg-[#dcecfb] text-[#12395a] dark:bg-slate-800 dark:text-white"
                        : isSubActive
                          ? "bg-[#e8f2fc] font-semibold text-[#0f2a43] dark:bg-slate-800 dark:text-white"
                          : "text-[#344154] hover:bg-[#f1f5f9] dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
            >
                {isSubPending && <PendingOverlay />}
                <span className="relative z-10 flex h-4 w-4 items-center justify-center text-[#64748b]">
                    {isSubPending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : Icon ? (
                        <Icon className="h-3.5 w-3.5" />
                    ) : null}
                </span>
                <span className="relative z-10 truncate">{isSubPending ? "Cargando..." : sub.label}</span>
            </button>
        )
    }

    return (
        <>
            <MobileMenuButton />
            <MobileOverlay />
            <TooltipProvider>
                <div
                    className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:z-auto lg:translate-x-0 ${
                        isMobileOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                    <SidebarTransition isCollapsed={shouldShowCollapsed}>
                        <div className="flex h-screen flex-col overflow-hidden border-r border-[#dde3ea] bg-[#fbfbfd] text-[#263447] shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                            <header className="border-b border-[#e2e8f0] px-5 pb-3 pt-4 dark:border-slate-800">
                                <div className="flex items-start justify-between gap-2">
                                    {!shouldShowCollapsed && (
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-[10px] bg-[#0f2f22]">
                                                <Image
                                                    src="/brand/araucoPro.png"
                                                    alt="AraucoPro"
                                                    fill
                                                    priority
                                                    sizes="40px"
                                                    className="object-contain p-1"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-lg font-extrabold leading-5 text-[#061328] dark:text-white">
                                                    Arauco<span className="text-[#007949]">Pro</span>
                                                </p>
                                                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#64748b]">
                                                    ERP - CRM - POS - Shopify - SII
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        title={shouldShowCollapsed ? "Expandir menu" : "Contraer menu"}
                                        onClick={() => (isMobile ? setIsMobileOpen(false) : setIsCollapsed(!isCollapsed))}
                                        className="rounded-md p-2 text-[#64748b] transition-colors hover:bg-[#edf2f7] hover:text-[#0f2a43] dark:hover:bg-slate-800 dark:hover:text-white"
                                    >
                                        {isMobile ? <FaTimes size={18} /> : shouldShowCollapsed ? <FaBars size={18} /> : <FaTimes size={18} />}
                                    </button>
                                </div>

                                {!shouldShowCollapsed && (
                                    <button className="mt-5 flex h-8 w-full items-center justify-between rounded-lg border border-[#d4dbe4] bg-[#edf1f5] px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#64748b] shadow-inner dark:border-slate-700 dark:bg-slate-900">
                                        <span>Mis accesos</span>
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </header>

                            <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
                                {filteredNavItems.map((item, index) => {
                                    const Icon = item.icon
                                    const sectionId = item.label.toLowerCase().replace(/\s+/g, "")
                                    const hasSubItems = Boolean(item.subItems?.length)
                                    const hasActiveChild = Boolean(item.subItems?.some((sub) => isRouteActive(sub.route)))
                                    const isActive = isRouteActive(item.route)
                                    const isPending = pendingRoute === item.route
                                    const isOpen = openSections[sectionId] ?? hasActiveChild

                                    return (
                                        <MotionItem key={item.label} delay={index}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={() => (hasSubItems ? toggleSection(sectionId) : handleNavClick(item.route))}
                                                        disabled={isPending}
                                                        className={`relative flex h-11 w-full items-center gap-3 overflow-hidden border-l-[3px] px-5 text-left text-sm transition-colors ${
                                                            shouldShowCollapsed ? "justify-center px-0" : ""
                                                        } ${
                                                            isPending
                                                                ? "cursor-progress border-[#2d7fb8] bg-[#dcecfb] text-[#0f2a43] dark:bg-slate-800 dark:text-white"
                                                                : isActive || hasActiveChild
                                                                  ? "border-[#2d7fb8] bg-[#e8f2fc] font-semibold text-[#0f2a43] dark:bg-slate-800 dark:text-white"
                                                                  : "border-transparent text-[#1f2937] hover:bg-[#f1f5f9] dark:text-slate-300 dark:hover:bg-slate-800"
                                                        }`}
                                                    >
                                                        {isPending && <PendingOverlay />}
                                                        <span className="relative z-10 flex h-5 w-5 flex-shrink-0 items-center justify-center text-[#64748b]">
                                                            {isPending ? (
                                                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Icon className="h-4 w-4" />
                                                            )}
                                                        </span>
                                                        {!shouldShowCollapsed && (
                                                            <>
                                                                <span className="relative z-10 min-w-0 flex-1 truncate">
                                                                    {isPending ? "Cargando..." : item.label}
                                                                </span>
                                                                {hasSubItems && (
                                                                    <ChevronDown
                                                                        className={`relative z-10 h-3.5 w-3.5 text-[#94a3b8] transition-transform ${
                                                                            isOpen ? "rotate-180" : ""
                                                                        }`}
                                                                    />
                                                                )}
                                                            </>
                                                        )}
                                                    </button>
                                                </TooltipTrigger>
                                                {shouldShowCollapsed && (
                                                    <TooltipContent side="right" className="z-[9999] ml-2">
                                                        {item.label}
                                                    </TooltipContent>
                                                )}
                                            </Tooltip>

                                            {hasSubItems && (
                                                <Collapsible isOpen={isOpen && !shouldShowCollapsed}>
                                                    <div className="border-l border-[#dbe3ec] bg-[#f8fafc] dark:border-slate-800 dark:bg-slate-950">
                                                        {item.subItems?.map(renderSubItem)}
                                                    </div>
                                                </Collapsible>
                                            )}
                                        </MotionItem>
                                    )
                                })}
                            </nav>

                            <footer className="flex h-14 items-center justify-between border-t border-[#e2e8f0] px-5 text-sm dark:border-slate-800">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="flex h-5 w-5 items-center justify-center text-[#64748b]">
                                                {isDarkMode ? <FaMoon size={15} /> : <FaSun size={15} />}
                                            </span>
                                            {!shouldShowCollapsed && (
                                                <span className="truncate text-[#475569] dark:text-slate-300">
                                                    {isDarkMode ? "Modo Oscuro" : "Modo Claro"}
                                                </span>
                                            )}
                                        </div>
                                    </TooltipTrigger>
                                    {shouldShowCollapsed && (
                                        <TooltipContent side="right" className="z-[9999] ml-2">
                                            Tema
                                        </TooltipContent>
                                    )}
                                </Tooltip>

                                {!shouldShowCollapsed && (
                                    <Switch
                                        checked={Boolean(isDarkMode)}
                                        onCheckedChange={setIsDarkMode}
                                        className="data-[state=checked]:bg-[#466682] data-[state=unchecked]:bg-[#466682]"
                                    />
                                )}
                            </footer>
                        </div>
                    </SidebarTransition>
                </div>
            </TooltipProvider>
        </>
    )
}
