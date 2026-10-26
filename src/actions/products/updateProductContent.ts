"use server"

import { revalidatePath } from "next/cache"
import { fetcher } from "@/lib/fetcher"
import { API_URL } from "@/lib/enviroments"
import { isValidProductImageList, serializeProductImages } from "@/utils/product-images"

type ProductContent = { image: string; description: string; slug: string }

export async function updateProductContent(productID: string, content: ProductContent): Promise<ProductContent> {
    if (!isValidProductImageList(content.image)) throw new Error("Ingresa hasta 5 URLs HTTP/HTTPS validas")
    const slug = content.slug.trim()
    const payload = { image: serializeProductImages(content.image), description: content.description.trim(), ...(slug ? { slug } : {}) }
    const result = await fetcher<ProductContent>(`${API_URL}/products/${productID}`, {
        method: "PATCH", body: JSON.stringify(payload),
    })
    revalidatePath("/home/inventory")
    return { image: result.image ?? "", description: result.description ?? "", slug: result.slug ?? "" }
}
