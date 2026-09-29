import type { ICategory } from "@/interfaces/categories/ICategory"
import type { IProduct } from "@/interfaces/products/IProduct"
import type { IProductVariation, IStoreProduct } from "@/interfaces/products/IProductVariation"
import type { IOffer } from "@/interfaces/pricing/IPricing"
import type { IStore } from "@/interfaces/stores/IStore"
import { pickArray, pickFirst, toNumber, toStringValue } from "./normalize-helpers"
import { normalizeStore } from "./normalize-user-store"

type RawOffer = Partial<IOffer> & {
    applied?: boolean
    source?: string
    previousPrice?: number
    resultingPrice?: number
    priority?: number
}

export type RawStoreProduct = {
    storeProductID?: string
    variationID?: string
    storeID?: string
    stock?: number
    priceCost?: string | number
    priceList?: string | number
    finalPrice?: number
    discountApplied?: boolean
    activeOffer?: RawOffer | null
    specialOffers?: RawOffer[]
    createdAt?: string
    updatedAt?: string
    store?: IStore | null
    Store?: IStore | null
}

type RawVariation = {
    variationID?: string
    productID?: string
    sku?: string
    variation?: string
    subVariation?: string
    supplierSku?: string | null
    barcode?: string | null
    size?: string
    color?: string | null
    createdAt?: string
    updatedAt?: string
    storeProducts?: RawStoreProduct[]
    StoreProducts?: RawStoreProduct[]
}

export type RawProduct = {
    productID?: string
    image?: string
    categoryID?: string | null
    category?: ICategory | null
    name?: string
    slug?: string
    brand?: string
    genre?: IProduct["genre"]
    description?: string | null
    variations?: RawVariation[]
    createdAt?: string
    updatedAt?: string
    wooID?: number | null
    totalProducts?: number
}

const normalizeStoreProduct = (raw: RawStoreProduct): IStoreProduct => ({
    storeProductID: raw.storeProductID ?? "",
    variationID: raw.variationID ?? "",
    storeID: pickFirst(raw.storeID, raw.store?.storeID, raw.Store?.storeID) ?? "",
    quantity: raw.stock ?? 0,
    priceCostStore: toStringValue(raw.priceCost),
    priceListStore: toStringValue(pickFirst(raw.priceList, raw.priceCost)),
    finalPrice: raw.finalPrice,
    discountApplied: raw.discountApplied,
    activeOffer: raw.activeOffer
        ? {
              ...raw.activeOffer,
              offerID: raw.activeOffer.offerID ?? "",
              storeProductID: raw.activeOffer.storeProductID ?? raw.storeProductID ?? "",
              discountType: raw.activeOffer.discountType ?? "PERCENTAGE",
              value: raw.activeOffer.value ?? 0,
              startDate: raw.activeOffer.startDate ?? "",
              isActive: raw.activeOffer.isActive ?? false,
              createdAt: raw.activeOffer.createdAt ?? "",
              updatedAt: raw.activeOffer.updatedAt ?? "",
              applied: raw.activeOffer.applied,
              source: raw.activeOffer.source,
              previousPrice: raw.activeOffer.previousPrice,
              resultingPrice: raw.activeOffer.resultingPrice,
              priority: raw.activeOffer.priority,
          }
        : null,
    specialOffers: pickArray(raw.specialOffers).map((offer) => ({
        ...offer,
        offerID: offer.offerID ?? "",
        storeProductID: offer.storeProductID ?? raw.storeProductID ?? "",
        discountType: offer.discountType ?? "PERCENTAGE",
        value: offer.value ?? 0,
        startDate: offer.startDate ?? "",
        isActive: offer.isActive ?? false,
        createdAt: offer.createdAt ?? "",
        updatedAt: offer.updatedAt ?? "",
    })),
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
    Store: normalizeStore(pickFirst(raw.store, raw.Store) ?? {}),
})

const normalizeVariation = (raw: RawVariation): IProductVariation => {
    const storeProducts = pickArray(raw.storeProducts, raw.StoreProducts).map(normalizeStoreProduct)
    return {
        variationID: raw.variationID ?? "",
        productID: raw.productID ?? "",
        sku: raw.sku ?? "",
        variation: raw.variation ?? raw.size ?? "",
        subVariation: raw.subVariation ?? raw.color ?? "",
        supplierSku: raw.supplierSku ?? null,
        barcode: raw.barcode ?? null,
        sizeNumber: raw.variation ?? raw.size ?? "",
        priceList: storeProducts[0] ? toNumber(storeProducts[0].priceListStore) : 0,
        priceCost: storeProducts[0] ? toNumber(storeProducts[0].priceCostStore) : 0,
        stockQuantity: storeProducts.reduce((sum, storeProduct) => sum + storeProduct.quantity, 0),
        createdAt: raw.createdAt ?? "",
        updatedAt: raw.updatedAt ?? "",
        Stores: storeProducts.map((storeProduct) => storeProduct.Store),
        StoreProducts: storeProducts,
    }
}

export const normalizeProduct = (raw: RawProduct): IProduct => {
    const variations = (raw.variations ?? []).map(normalizeVariation)

    return {
        productID: raw.productID ?? "",
        image: raw.image ?? "",
        categoryID: raw.categoryID ?? null,
        Category: raw.category ?? undefined,
        name: raw.name ?? "",
        slug: raw.slug ?? "",
        brand: (raw.brand as IProduct["brand"]) ?? "Otro",
        genre: raw.genre ?? "Unisex",
        description: raw.description ?? "",
        wooID: raw.wooID ?? null,
        totalProducts: raw.totalProducts ?? 0,
        createdAt: raw.createdAt ?? "",
        updatedAt: raw.updatedAt ?? "",
        ProductVariations: variations,
        stock: variations.reduce((sum, variation) => sum + variation.stockQuantity, 0),
    }
}

export const normalizeStoreProductList = (items: RawStoreProduct[]): IStoreProduct[] => items.map(normalizeStoreProduct)
