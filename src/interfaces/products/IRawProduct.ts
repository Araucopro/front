import type { ICategory } from "../categories/ICategory"
import type { IStore } from "../stores/IStore"

export interface IStoreProductRaw {
    storeProductID: string
    variationID: string
    storeID: string
    stock: number
    priceCost: number
    priceList: number
    createdAt: string
    updatedAt: string
    store?: IStore
    Store?: IStore
}

export interface IProductVariationRaw {
    variationID: string
    productID: string
    sku: string
    variation?: string
    subVariation?: string
    supplierSku?: string | null
    barcode?: string | null
    size: string
    color: string | null
    createdAt: string
    updatedAt: string
    storeProducts: IStoreProductRaw[]
    StoreProducts?: IStoreProductRaw[]
}

export interface IRawProduct {
    productID: string
    image: string
    categoryID: string | null
    category: ICategory | null
    name: string
    slug?: string
    brand: string
    genre: "Hombre" | "Mujer" | "Unisex"
    description: string | null
    variations: IProductVariationRaw[]
    createdAt: string
    updatedAt: string
    wooID: number | null
    totalProducts: number
}
