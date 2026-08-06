import { redirect } from "next/navigation"

interface LegacyWebSalePageProps {
    params: Promise<{
        saleID: string
    }>
    searchParams?: Promise<{ storeID?: string | string[] }>
}

export default async function LegacyWebSalePage({ params, searchParams }: LegacyWebSalePageProps) {
    const { saleID } = await params
    const resolvedSearchParams = await searchParams
    const rawStoreID = resolvedSearchParams?.storeID
    const storeID = Array.isArray(rawStoreID) ? rawStoreID[0] : rawStoreID
    const query = storeID ? `?storeID=${encodeURIComponent(storeID)}` : ""
    redirect(`/home/${encodeURIComponent(saleID)}${query}`)
}
