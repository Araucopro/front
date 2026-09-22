import CreateProductForm from "@/components/Inventory/CreateProduct/CreateProductForm"
import { getAllCategories } from "@/actions/categories/getAllCategories"
import { checkStatus } from "@/actions/auth/authActions"
import { getMyStores } from "@/actions/stores/getAllStores"
import { resolveAccessibleStoreID } from "@/lib/store-access"
import { Role } from "@/lib/userRoles"

type CreateProductPageProps = {
    searchParams?: Promise<{ storeID?: string | string[] }>
}

const parseParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value)

export default async function CreateProductPage({ searchParams }: CreateProductPageProps) {
    const resolvedSearchParams = await searchParams
    const requestedStoreID = parseParam(resolvedSearchParams?.storeID)
    const [auth, stores] = await Promise.all([checkStatus().catch(() => null), getMyStores()])
    const storeID = resolveAccessibleStoreID(requestedStoreID, stores, auth?.user?.role === Role.Admin)
    const [categories] = await Promise.all([getAllCategories()])
    return <CreateProductForm categories={categories} initialStoreID={storeID} />
}
