"use server"

import { revalidatePath } from "next/cache"
import { fetcher } from "@/lib/fetcher"
import { API_URL } from "@/lib/enviroments"
import { CreateProductFormData } from "@/interfaces/products/ICreateProductForm"
import { getInventoryProducts } from "./getInventoryProducts"

interface MassiveCreateProductData {
    products: CreateProductFormData[]
    validateExistingSkus?: boolean
}

const normalizeSku = (sku: unknown) => String(sku ?? "").trim()

const findDuplicatedSkuInPayload = (products: CreateProductFormData[]) => {
    const seenSkus = new Map<string, { productName: string; sizeNumber: string }>()

    for (const product of products) {
        for (const size of product.sizes) {
            const sku = normalizeSku(size.sku)
            if (!sku) continue

            const previous = seenSkus.get(sku)
            if (previous) {
                return {
                    sku,
                    previous,
                    current: {
                        productName: product.name,
                        sizeNumber: String(size.sizeNumber ?? "").trim(),
                    },
                }
            }

            seenSkus.set(sku, {
                productName: product.name,
                sizeNumber: String(size.sizeNumber ?? "").trim(),
            })
        }
    }

    return null
}

const getExistingSkus = async () => {
    const products = await getInventoryProducts()
    const skus = new Set<string>()

    for (const product of products) {
        for (const variation of product.variations ?? []) {
            const sku = normalizeSku(variation.sku)
            if (sku) skus.add(sku)
        }
    }

    return skus
}

const findExistingSkuInPayload = async (products: CreateProductFormData[]) => {
    const existingSkus = await getExistingSkus()

    for (const product of products) {
        for (const size of product.sizes) {
            const sku = normalizeSku(size.sku)
            if (sku && existingSkus.has(sku)) {
                return {
                    sku,
                    productName: product.name,
                    sizeNumber: String(size.sizeNumber ?? "").trim(),
                }
            }
        }
    }

    return null
}

export const createMassiveProducts = async (data: MassiveCreateProductData) => {
    try {
        const duplicatedSku = findDuplicatedSkuInPayload(data.products)
        if (duplicatedSku) {
            return {
                success: false,
                error: `El SKU/EAN ${duplicatedSku.sku} está repetido en el lote: "${duplicatedSku.previous.productName}" talla ${duplicatedSku.previous.sizeNumber || "-"} y "${duplicatedSku.current.productName}" talla ${duplicatedSku.current.sizeNumber || "-"}. Corrige el Excel antes de guardar.`,
            }
        }

        if (data.validateExistingSkus) {
            const existingSku = await findExistingSkuInPayload(data.products)
            if (existingSku) {
                return {
                    success: false,
                    error: `El SKU/EAN ${existingSku.sku} ya existe en inventario. Producto: "${existingSku.productName}", talla ${existingSku.sizeNumber || "-"}. Quita esa fila o usa un SKU distinto.`,
                }
            }
        }

        for (const product of data.products) {
            const body = {
                name: product.name,
                image: product.image,
                categoryID: product.categoryID,
                brand: product.brand,
                genre: product.genre,
                ...(product.description?.trim() ? { description: product.description.trim() } : {}),
                ...(product.slug?.trim() ? { slug: product.slug.trim() } : {}),
                variations: product.sizes.map((size) => ({
                    sku: normalizeSku(size.sku),
                    priceCost: Number(size.priceCost),
                    priceList: Number(size.priceList),
                    stock: Number(size.stockQuantity),
                    variation: String(size.sizeNumber ?? "").trim(),
                    ...(size.subVariation?.trim() ? { subVariation: size.subVariation.trim() } : {}),
                    ...(size.supplierSku?.trim() ? { supplierSku: size.supplierSku.trim() } : {}),
                    ...(size.barcode?.trim() ? { barcode: size.barcode.trim() } : {}),
                })),
            }

            try {
                await fetcher(`${API_URL}/products`, {
                    method: "POST",
                    body: JSON.stringify(body),
                })
            } catch (err) {
                const message = err instanceof Error ? err.message : ""
                const duplicatedKeyMessage = message.toLowerCase().includes("duplicate key")

                if (duplicatedKeyMessage) {
                    const skus = body.variations.map((variation) => variation.sku).filter(Boolean).join(", ")
                    return {
                        success: false,
                        error: `No se pudo crear "${product.name}" porque alguno de sus SKU/EAN ya existe (${skus}). Revisa si el producto ya fue importado antes.`,
                    }
                }

                throw err
            }
        }

        revalidatePath("/inventory")
        return { success: true }
    } catch (err) {
        console.error("Error al crear productos:", err)
        return {
            success: false,
            error: "No se pudieron crear los productos. Verifica los datos o intenta más tarde.",
        }
    }
}
