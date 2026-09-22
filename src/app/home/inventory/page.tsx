import { getInventoryProducts } from "@/actions/products/getInventoryProducts"
import { getStoreStockProducts } from "@/actions/inventory/getStoreStock"
import { getAllCategories } from "@/actions/categories/getAllCategories"
import { getMyStores } from "@/actions/stores/getAllStores"
import { checkStatus } from "@/actions/auth/authActions"
import InventoryClientWrapper from "@/components/Inventory/InventoryClientWrapper"
import { resolveAccessibleStoreID } from "@/lib/store-access"
import { Role } from "@/lib/userRoles"

type InventoryPageProps = {
    searchParams?: Promise<{ storeID?: string | string[] }>
}

const SPECIAL_STORE_FILTERS = new Set(["all", "propias", "consignadas"])

const parseParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value)

const getInventoryData = async (storeID?: string) => {
    if (storeID && !SPECIAL_STORE_FILTERS.has(storeID)) {
        try {
            return await getStoreStockProducts(storeID)
        } catch (error) {
            console.warn("InventoryPage: fallback to full products after store stock error:", error)
        }
    }

    return getInventoryProducts()
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
    const resolvedSearchParams = await searchParams
    const requestedStoreID = parseParam(resolvedSearchParams?.storeID)

    // Lógica de obtención en servidor
    const [auth, categoriesData, storesData] = await Promise.all([
        checkStatus().catch(() => null),
        getAllCategories(),
        getMyStores(),
    ])
    const storeID = resolveAccessibleStoreID(requestedStoreID, storesData, auth?.user?.role === Role.Admin)
    const productsData = await getInventoryData(storeID)
    /**
     * 1) Generar el mapper para crear productos en woo - Separar productos simples de variantes
     * 1.1) ¿Generar 2 mappers diferentes uno solo para productos y otro solo para variantes?
     * 
     * payload: {toCreate: WooProduct[], toUpdate: WooProduct[]}
     *
     * 2) Crear productos padre y la respuesta viene con wooID
     *
     * 3) Actualizar el sistema que tiene wooID = null con la obtenida desde woocommerce
     *
     * 4) Acá tendríamos el payload de las VARIACIONES (new Map<number, WooProduct>())
     * 
        [GET, POST, PUT, DELETE]
        wp-json/wc/v3/products/[wooID] <- Productos padres o simples
        wp-json/wc/v3/products/[wooID]/variations/[wooID] <- variaciones
     */

    return (
        <main className="p-6 flex-1 flex flex-col h-screen">
            <InventoryClientWrapper initialProducts={productsData} categories={categoriesData} stores={storesData} />
        </main>
    )
}
