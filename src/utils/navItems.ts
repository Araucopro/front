import type { IconType } from "react-icons"
import {
    FaBalanceScale,
    FaBell,
    FaBook,
    FaBox,
    FaBuilding,
    FaChartBar,
    FaChartLine,
    FaCashRegister,
    FaCog,
    FaExchangeAlt,
    FaFileAlt,
    FaFileInvoice,
    FaHome,
    FaMoneyBillWave,
    FaReceipt,
    FaShoppingCart,
    FaStore,
    FaTags,
    FaTruck,
    FaUniversity,
    FaUsers,
    FaUserTie,
} from "react-icons/fa"

export type NavigationItemStatus = "in-development" | "coming-soon"

export interface NavigationItem {
    id: string
    label: string
    route?: string
    icon: IconType
    iconClassName?: string
    status?: NavigationItemStatus
    subItems?: NavigationItem[]
}

export const navItems: NavigationItem[] = [
    {
        id: "cash",
        label: "Caja",
        route: "/home",
        icon: FaHome,
        iconClassName: "text-[#ef6b5b]",
    },
    {
        id: "inventory",
        label: "Inventario",
        icon: FaBox,
        iconClassName: "text-[#b7794f]",
        subItems: [
            {
                id: "my-inventory",
                label: "Mi Inventario",
                route: "/home/inventory",
                icon: FaBox,
                iconClassName: "text-[#b7794f]",
            },
            {
                id: "discounts",
                label: "Descuentos",
                route: "/home/inventory/discounts",
                icon: FaTags,
                iconClassName: "text-[#f59e0b]",
            },
            {
                id: "transfers",
                label: "Transferencias",
                route: "/home/transfers",
                icon: FaExchangeAlt,
                iconClassName: "text-[#3b82f6]",
            },
            {
                id: "inventory-records",
                label: "Actas",
                icon: FaFileAlt,
                iconClassName: "text-[#e07a5f]",
                status: "coming-soon",
            },
        ],
    },
    {
        id: "commercial",
        label: "Comercial",
        icon: FaFileInvoice,
        iconClassName: "text-[#a7a3c2]",
        subItems: [
            {
                id: "quotes",
                label: "Cotizaciones",
                route: "/home/quotes",
                icon: FaFileInvoice,
                iconClassName: "text-[#e07a5f]",
            },
            {
                id: "sales-notes",
                label: "Notas de Venta",
                route: "/home/createsale?saleType=NOTA_VENTA",
                icon: FaBook,
                iconClassName: "text-[#6d4c7d]",
            },
            {
                id: "sales",
                label: "Ventas",
                icon: FaMoneyBillWave,
                iconClassName: "text-[#34b77a]",
                subItems: [
                    {
                        id: "electronic-receipt",
                        label: "Boleta electrónica",
                        route: "/home/createsale?saleType=BOLETA",
                        icon: FaReceipt,
                        iconClassName: "text-[#34b77a]",
                    },
                    {
                        id: "electronic-invoice",
                        label: "Factura electrónica",
                        route: "/home/createsale?saleType=FACTURA",
                        icon: FaFileInvoice,
                        iconClassName: "text-[#3b82f6]",
                    },
                    {
                        id: "dispatch-guides",
                        label: "Guías de despacho",
                        route: "/home/dispatch-guides",
                        icon: FaTruck,
                        iconClassName: "text-[#8b5cf6]",
                    },
                ],
            },
            {
                id: "purchases",
                label: "Compras",
                icon: FaShoppingCart,
                iconClassName: "text-[#64748b]",
                subItems: [
                    {
                        id: "create-purchase-order",
                        label: "Crear orden de compra",
                        route: "/home/purchaseOrder",
                        icon: FaShoppingCart,
                        iconClassName: "text-[#64748b]",
                    },
                    {
                        id: "purchase-orders",
                        label: "Órdenes de compra",
                        route: "/home/invoices",
                        icon: FaFileInvoice,
                        iconClassName: "text-[#8b5cf6]",
                    },
                ],
            },
            {
                id: "electronic-books",
                label: "Libros Electrónicos",
                icon: FaBook,
                iconClassName: "text-[#818cf8]",
                status: "coming-soon",
            },
            {
                id: "clients",
                label: "Clientes",
                route: "/home/clients",
                icon: FaUsers,
                iconClassName: "text-[#6d4c7d]",
            },
            {
                id: "suppliers",
                label: "Proveedores",
                icon: FaTruck,
                iconClassName: "text-[#e8798f]",
                status: "coming-soon",
            },
            {
                id: "commercial-administration",
                label: "Administración",
                icon: FaFileAlt,
                iconClassName: "text-[#ef7d7d]",
                status: "coming-soon",
            },
            {
                id: "sii-configuration",
                label: "Configuración SII",
                icon: FaCog,
                iconClassName: "text-[#a78bba]",
                status: "coming-soon",
            },
        ],
    },
    {
        id: "expenses",
        label: "Egresos",
        icon: FaMoneyBillWave,
        iconClassName: "text-[#16a66a]",
        status: "in-development",
    },
    {
        id: "kpis",
        label: "KPI's",
        route: "/home/controlDeMando",
        icon: FaChartLine,
        iconClassName: "text-[#6486d9]",
    },
    {
        id: "income-statement",
        label: "Estado de Resultados",
        route: "/home/incomeStatement",
        icon: FaChartBar,
        iconClassName: "text-[#42b883]",
    },
    {
        id: "pre-balance",
        label: "Pre-Balance",
        icon: FaBalanceScale,
        iconClassName: "text-[#f59e0b]",
        status: "coming-soon",
    },
    {
        id: "reports",
        label: "Informes",
        icon: FaFileAlt,
        iconClassName: "text-[#d88ca0]",
        status: "coming-soon",
    },
    {
        id: "human-resources",
        label: "Recursos Humanos",
        route: "/home/recursos-humanos",
        icon: FaUserTie,
        iconClassName: "text-[#5c3b83]",
    },
    {
        id: "configuration",
        label: "Configuración",
        icon: FaCog,
        iconClassName: "text-[#b8a5d2]",
        subItems: [
            {
                id: "cash-registers",
                label: "Configuración de cajas",
                route: "/home/cajas",
                icon: FaCashRegister,
                iconClassName: "text-[#0f766e]",
            },
            {
                id: "company",
                label: "Empresa",
                icon: FaBuilding,
                iconClassName: "text-[#47738f]",
                status: "coming-soon",
            },
            {
                id: "stores",
                label: "Tiendas y Bodegas",
                route: "/home/usuarios",
                icon: FaStore,
                iconClassName: "text-[#dc4f73]",
            },
            {
                id: "users",
                label: "Usuarios",
                route: "/home/configuracion/usuarios",
                icon: FaUsers,
                iconClassName: "text-[#5c3b83]",
            },
            {
                id: "bank-details",
                label: "Datos Bancarios",
                icon: FaUniversity,
                iconClassName: "text-[#85839b]",
                status: "coming-soon",
            },
            {
                id: "pricing-rules",
                label: "Mark-up, Impuestos & Reservas",
                icon: FaFileAlt,
                iconClassName: "text-[#e07a5f]",
                status: "coming-soon",
            },
            {
                id: "alerts",
                label: "Alertas",
                icon: FaBell,
                iconClassName: "text-[#f59e0b]",
                status: "coming-soon",
            },
        ],
    },
]
