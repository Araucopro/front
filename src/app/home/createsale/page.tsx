import { redirect } from "next/navigation"

type CreateSalePageProps = {
    searchParams?: Promise<{ storeID?: string | string[] }>
}

const parseParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value)

export default async function CreateSalePage({ searchParams }: CreateSalePageProps) {
    const params = await searchParams
    const storeID = parseParam(params?.storeID)

    redirect(storeID ? `/home?storeID=${encodeURIComponent(storeID)}` : "/home")
}
