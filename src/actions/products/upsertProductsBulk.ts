"use server"

import { revalidatePath } from "next/cache"
import {
    BULK_PRODUCT_BATCH_SIZE,
    type ICreateProductsBulk,
    type IBulkProductsResult,
} from "@/interfaces/products/IBulkProduct"
import type { IProduct } from "@/interfaces/products/IProduct"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import { normalizeProduct, type RawProduct } from "@/lib/normalize-product"

export const upsertProductsBulk = async (payload: ICreateProductsBulk): Promise<IBulkProductsResult> => {
    if (payload.items.length === 0) {
        return { success: false, productsCreatedOrUpdated: 0, error: "Agrega al menos un producto." }
    }

    if (payload.items.length > BULK_PRODUCT_BATCH_SIZE) {
        return {
            success: false,
            productsCreatedOrUpdated: 0,
            error: `El lote supera el máximo de ${BULK_PRODUCT_BATCH_SIZE} productos.`,
        }
    }

    try {
        const response = await fetcher<RawProduct[]>(`${API_URL}/products/bulk`, {
            method: "POST",
            body: JSON.stringify(payload),
        })
        if (!Array.isArray(response)) {
            return {
                success: false,
                productsCreatedOrUpdated: 0,
                error: "El API devolvió una respuesta inesperada para la carga masiva.",
            }
        }
        if (response.length !== payload.items.length) {
            return {
                success: false,
                productsCreatedOrUpdated: 0,
                error: `El API procesó ${response.length} de ${payload.items.length} productos del lote.`,
            }
        }
        const products: IProduct[] = response.map(normalizeProduct)

        revalidatePath("/home/inventory")
        return { success: true, productsCreatedOrUpdated: products.length }
    } catch (error) {
        return {
            success: false,
            productsCreatedOrUpdated: 0,
            error: error instanceof Error ? error.message : "No fue posible procesar la carga masiva.",
        }
    }
}
