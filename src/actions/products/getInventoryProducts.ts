import { IRawProduct } from "@/interfaces/products/IRawProduct"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"

const INVENTORY_PAGE_SIZE = 50

const getInventoryProductsPage = async (limit?: number, offset?: number): Promise<IRawProduct[]> => {
    const params = new URLSearchParams()
    if (limit !== undefined) params.append("limit", limit.toString())
    if (offset !== undefined) params.append("offset", offset.toString())

    const url = `${API_URL}/products${params.toString() ? `?${params.toString()}` : ""}`
    const raw = await fetcher<IRawProduct[]>(url)

    if (!Array.isArray(raw)) {
        console.warn("getInventoryProducts: La respuesta no es un array:", raw)
        return []
    }

    return raw.map((product) => ({
        ...product,
        variations: (product.variations ?? []).map((variation) => ({
            ...variation,
            size: variation.variation ?? variation.size ?? "",
            subVariation: variation.subVariation ?? variation.color ?? "",
        })),
    }))
}

export const getInventoryProducts = async (limit?: number, offset?: number): Promise<IRawProduct[]> => {
    try {
        if (limit !== undefined || offset !== undefined) {
            return getInventoryProductsPage(limit, offset)
        }

        const productsById = new Map<string, IRawProduct>()
        let currentOffset = 0

        while (true) {
            const page = await getInventoryProductsPage(INVENTORY_PAGE_SIZE, currentOffset)
            let addedProducts = 0

            for (const product of page) {
                if (!productsById.has(product.productID)) {
                    productsById.set(product.productID, product)
                    addedProducts++
                }
            }

            if (page.length < INVENTORY_PAGE_SIZE || addedProducts === 0) break

            currentOffset += INVENTORY_PAGE_SIZE
        }

        return Array.from(productsById.values())
    } catch (error) {
        console.warn("getInventoryProducts: Error fetching products:", error)
        return []
    }
}
