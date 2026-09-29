import { IStore } from "../stores/IStore"
import { IProduct } from "./IProduct"
import { IOffer } from "../pricing/IPricing"

export interface IStoreProductActiveOffer extends IOffer {
    applied?: boolean
    source?: string
    previousPrice?: number
    resultingPrice?: number
    priority?: number
}

export interface IStoreProduct {
    storeProductID: string
    variationID: string
    storeID: string
    quantity: number
    priceCostStore: string
    priceListStore: string
    finalPrice?: number
    discountApplied?: boolean
    activeOffer?: IStoreProductActiveOffer | null
    specialOffers?: IOffer[]
    createdAt: string
    updatedAt: string
    Store: IStore
}

export interface IProductVariation {
    createdAt: string
    updatedAt: string
    variationID: string
    productID: string
    sizeNumber: string
    priceList: number
    priceCost: number
    sku: string
    variation?: string
    subVariation?: string
    supplierSku?: string | null
    barcode?: string | null
    stockQuantity: number
    Stores?: IStore[]
    StoreProducts?: IStoreProduct[]
}

export interface IVariationFromOrder extends IProductVariation {
    OrderProduct: {
        OrderProductID: string
        orderID: string
        variationID: string
        quantityOrdered: number
        priceCost: number
        subtotal: number
        createdAt: string
        updatedAt: string
    }
    Product: IProduct
}
