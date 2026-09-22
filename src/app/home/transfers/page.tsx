import { getAllTransfers } from "@/actions/transfers/getAllTransfers"
import { getMyStores } from "@/actions/stores/getAllStores"
import TransfersClientWrapper from "@/components/Transfers/TransfersClientWrapper"
import { parseTransferListFilters, transferListDefaults } from "@/lib/transfers-query"

interface TransfersPageProps {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function TransfersPage({ searchParams }: TransfersPageProps) {
    const resolvedSearchParams = await searchParams
    const requestedFilters = parseTransferListFilters(resolvedSearchParams)
    const stores = await getMyStores()
    const accessibleStoreIDs = new Set(stores.map((store) => store.storeID))
    const filters = {
        ...requestedFilters,
        originStoreID:
            requestedFilters.originStoreID && accessibleStoreIDs.has(requestedFilters.originStoreID)
                ? requestedFilters.originStoreID
                : undefined,
        destinationStoreID:
            requestedFilters.destinationStoreID && accessibleStoreIDs.has(requestedFilters.destinationStoreID)
                ? requestedFilters.destinationStoreID
                : undefined,
    }

    const transferResult = await getAllTransfers(filters)

    const filterKey = [
        filters.originStoreID ?? "",
        filters.destinationStoreID ?? "",
        filters.status ?? "",
        filters.page ?? transferListDefaults.page,
        filters.limit ?? transferListDefaults.limit,
    ].join("|")

    return (
        <main className="p-6 flex-1 flex flex-col h-screen overflow-hidden">
            <TransfersClientWrapper
                key={filterKey}
                initialTransfers={transferResult.items}
                paginationMeta={transferResult.meta}
                stores={stores}
                initialFilters={filters}
            />
        </main>
    )
}
