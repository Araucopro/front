import { create } from "zustand"
import { toast } from "sonner"
import { useTienda } from "./tienda.store"
import { IStoreProduct } from "@/interfaces/products/IProductVariation"
import { IVariationWithQuantity } from "@/interfaces/orders/IOrder"

type SaleItemOffer = {
    offerID: string
    description?: string
}

interface SaleItem {
    productName: string
    productImage?: string | null
    variationID: string
    sku: string
    sizeNumber: string
    priceList: number
    quantity: number
    stockQuantity: number
    storeProductID: string
    storeID: string
    storeName?: string
    finalPrice?: number
    activeOffer?: SaleItemOffer | null
}

interface SaleState {
    cartItems: SaleItem[]
    loading: boolean
    actions: {
        addProduct: (
            product: { name: string; image?: string | null },
            variation: IVariationWithQuantity,
            storeProduct: IStoreProduct,
            finalPrice?: number,
            activeOffer?: SaleItemOffer | null,
            allowNegativeStock?: boolean,
        ) => void
        removeProduct: (storeProductID: string) => void
        updateQuantity: (storeProductID: string, quantity: number) => void
        updateCartItemPricing: (
            storeProductID: string,
            pricing: { finalPrice?: number; activeOffer?: SaleItemOffer | null },
        ) => void
        clearCart: () => void
    }
}

export const useSaleStore = create<SaleState>((set, get) => ({
    cartItems: [],
    loading: false,
    actions: {
        addProduct: (product, variation, storeProduct, finalPrice, activeOffer, allowNegativeStockOverride) => {
            const { storeSelected } = useTienda.getState()
            const storeIdFromProduct = storeProduct.storeID || storeProduct.Store?.storeID
            if (!storeSelected && !storeIdFromProduct) {
                toast.error("Debes elegir una tienda")
                return
            }
            const { cartItems } = get()
            const storeProductID = storeProduct.storeProductID
            const existingItem = cartItems.find((item) => item.storeProductID === storeProductID || item.sku === variation.sku)
            const stockQuantity = existingItem ? existingItem.stockQuantity : variation.stockQuantity ?? 0
            const currentQuantity = existingItem ? existingItem.quantity : 0
            const allowNegativeStock = allowNegativeStockOverride ?? storeSelected?.allowNegativeStock ?? false

            if (!allowNegativeStock && currentQuantity + 1 > stockQuantity) {
                toast("No se puede agregar más, stock insuficiente.")
                return
            }

            const desiredQuantity = variation.quantity ?? 1
            const normalizedQuantity = allowNegativeStock
                ? Math.max(1, desiredQuantity)
                : Math.max(0, Math.min(desiredQuantity, variation.stockQuantity ?? 0))
            if (normalizedQuantity <= 0) {
                toast.error("Este producto no tiene stock en la tienda seleccionada")
                return
            }

            if (existingItem) {
                const newCartItems = cartItems.map((item) => {
                    if (item.storeProductID === storeProductID || item.sku === variation.sku) {
                        return {
                            ...item,
                            quantity: item.quantity + 1,
                        }
                    }
                    return item
                })
                set({ cartItems: newCartItems })
            } else {
                const newCartItems = [
                    ...cartItems,
                    {
                        productName: product.name,
                        productImage: product.image ?? null,
                        variationID: variation.variationID,
                        sku: variation.sku,
                        sizeNumber: variation.sizeNumber,
                        priceList: variation.priceList,
                        quantity: normalizedQuantity,
                        stockQuantity: variation.stockQuantity ?? 0,
                        storeProductID,
                        storeID: storeProduct.storeID || storeProduct.Store?.storeID || "",
                        storeName: storeProduct.Store?.name,
                        finalPrice,
                        activeOffer,
                    },
                ]
                set({ cartItems: newCartItems })
            }
        },
        removeProduct: (storeProductID) => {
            set((state) => {
                const newCartItems = state.cartItems.filter((item) => item.storeProductID !== storeProductID)
                return { cartItems: newCartItems }
            })
        },
        updateQuantity: (storeProductID, quantity) => {
            set((state) => {
                const newCartItems = state.cartItems.map((item) =>
                    item.storeProductID === storeProductID ? { ...item, quantity } : item,
                )
                return { cartItems: newCartItems }
            })
        },
        updateCartItemPricing: (storeProductID, pricing) => {
            set((state) => {
                const newCartItems = state.cartItems.map((item) =>
                    item.storeProductID === storeProductID
                        ? {
                              ...item,
                              finalPrice:
                                  pricing.finalPrice !== undefined ? pricing.finalPrice : item.finalPrice,
                              activeOffer:
                                  pricing.activeOffer !== undefined ? pricing.activeOffer : item.activeOffer,
                          }
                        : item,
                )
                return { cartItems: newCartItems }
            })
        },
        clearCart: () => {
            set({ cartItems: [] })
        },
    },
}))
