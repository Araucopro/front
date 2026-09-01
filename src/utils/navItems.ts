import {
    FaBox,
    FaCashRegister,
    FaChartBar,
    FaChartLine,
    FaExchangeAlt,
    FaFileInvoice,
    FaHome,
    FaReceipt,
    FaShoppingCart,
    FaTags,
    FaTruck,
    FaUsers,
} from "react-icons/fa"

export const navItems = [
    {
        label: "Caja",
        route: "/home",
        icon: FaHome,
    },
    {
        label: "Inventario",
        icon: FaBox,
        subItems: [
            { label: "Mi Inventario", route: "/home/inventory", icon: FaBox },
            { label: "Descuentos", route: "/home/inventory/discounts", icon: FaTags },
            { label: "Transferencias", route: "/home/transfers", icon: FaExchangeAlt },
        ],
    },
    {
        label: "Comercial",
        icon: FaFileInvoice,
        subItems: [
            { label: "Venta", route: "/home/createsale?saleType=NOTA_VENTA", icon: FaCashRegister },
            { label: "Crear factura electronica", route: "/home/createsale?saleType=FACTURA", icon: FaFileInvoice },
            { label: "Crear boleta electronica", route: "/home/createsale?saleType=BOLETA", icon: FaReceipt },
            { label: "Guias de despacho", route: "/home/dispatch-guides", icon: FaTruck },
            { label: "Cotizar", route: "/home/quotes", icon: FaFileInvoice },
            { label: "Crear OC", route: "/home/purchaseOrder", icon: FaShoppingCart },
            { label: "Ordenes de Compra", route: "/home/invoices", icon: FaFileInvoice },
        ],
    },
    {
        label: "UTI",
        route: "/home/usuarios",
        icon: FaUsers,
    },
    {
        label: "Control de Mando",
        route: "/home/controlDeMando",
        icon: FaChartLine,
    },
    {
        label: "Estado de Resultados",
        route: "/home/incomeStatement",
        icon: FaChartBar,
    },
]
