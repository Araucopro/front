import type { Genre } from "@/interfaces/products/IProduct"

export const BULK_PRODUCT_BATCH_SIZE = 100

export interface IBulkProductVariation {
    sku: string
    priceCost: number
    priceList: number
    stock: number
    color?: string
    size?: string
    supplierSku?: string
}

export interface IBulkProductItem {
    name: string
    categoryName: string
    image?: string
    brand?: string
    genre?: Genre
    description?: string
    variations: IBulkProductVariation[]
}

export interface ICreateProductsBulk {
    items: IBulkProductItem[]
}

export interface IBulkProductsResult {
    success: boolean
    productsCreatedOrUpdated: number
    error?: string
}
