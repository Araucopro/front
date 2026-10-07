"use server"

import { revalidatePath } from "next/cache"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"

export async function deleteProductVariation(productID: string, variationID: string): Promise<void> {
    await fetcher<void>(`${API_URL}/products/${encodeURIComponent(productID)}/variations/${encodeURIComponent(variationID)}`, {
        method: "DELETE",
    })
    revalidatePath("/home/inventory")
}
