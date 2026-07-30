import { redirect } from "next/navigation"

interface LegacyWebSalePageProps {
    params: Promise<{
        saleID: string
    }>
}

export default async function LegacyWebSalePage({ params }: LegacyWebSalePageProps) {
    const { saleID } = await params
    redirect(`/home/${encodeURIComponent(saleID)}`)
}
