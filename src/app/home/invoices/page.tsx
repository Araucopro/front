import { getAllPurchaseOrders } from "@/actions/purchase-orders/getAllPurchaseOrders"
import { getMyStores } from "@/actions/stores/getAllStores"
import InvoicesClient from "@/components/Invoices/InvoicesClient"

export default async function InvoicesPage() {
    const [orders, stores] = await Promise.all([getAllPurchaseOrders(), getMyStores()])

    return (
        <main className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Ordenes de Compra</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Gestiona y visualiza todas las órdenes del sistema
                </p>
            </div>

            <InvoicesClient initialOrders={orders} stores={stores} />
        </main>
    )
}
