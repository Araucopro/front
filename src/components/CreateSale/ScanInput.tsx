"use client"

import { ChangeEvent, KeyboardEvent, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { getPriceCheck } from "@/actions/pricing/getPriceCheck"
import { IVariationWithQuantity } from "@/interfaces/orders/IOrder"
import { IProduct } from "@/interfaces/products/IProduct"
import { IProductVariation, IStoreProduct } from "@/interfaces/products/IProductVariation"
import { useSaleStore } from "@/stores/sale.store"
import { useTienda } from "@/stores/tienda.store"
import { Search } from "lucide-react"

interface Props {
    initialProducts: IProduct[]
}

type SearchOption = {
    product: IProduct
    variation: IProductVariation
    storeProduct: IStoreProduct
    stockQuantity: number
    searchText: string
}

const normalizeSearchText = (value: string) =>
    value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/gi, " ")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim()

const normalizeSku = (value: string) => value.trim().toLowerCase()

const resolveStoreProductStoreId = (storeProduct: IStoreProduct) =>
    storeProduct.storeID || storeProduct.Store?.storeID

const findStoreProductForStore = (variation: IProductVariation, storeID: string) => {
    if (!storeID) return undefined
    return variation.StoreProducts?.find((storeProduct) => resolveStoreProductStoreId(storeProduct) === storeID)
}

const getStoreProductStock = (storeProduct?: IStoreProduct) => {
    if (!storeProduct) return 0
    const quantity = Number(storeProduct.quantity)
    return Number.isFinite(quantity) ? quantity : 0
}

const buildSearchText = (product: IProduct, variation: IProductVariation) =>
    normalizeSearchText(
        [
            product.name,
            product.brand,
            product.Category?.name,
            product.genre,
            variation.sku,
            variation.sizeNumber,
        ]
            .filter(Boolean)
            .join(" "),
    )

export const ScanInput = ({ initialProducts }: Props) => {
    const { addProduct } = useSaleStore((state) => state.actions)
    const { storeSelected } = useTienda()
    const searchParams = useSearchParams()
    const [productInput, setProductCode] = useState("")

    const effectiveStoreID = storeSelected?.storeID ?? searchParams.get("storeID") ?? ""

    const storeOptions = useMemo<SearchOption[]>(() => {
        if (!Array.isArray(initialProducts) || !effectiveStoreID) return []

        const options: SearchOption[] = []

        for (const product of initialProducts) {
            for (const variation of product.ProductVariations || []) {
                const storeProduct = findStoreProductForStore(variation, effectiveStoreID)
                if (!storeProduct) continue

                options.push({
                    product,
                    variation,
                    storeProduct,
                    stockQuantity: getStoreProductStock(storeProduct),
                    searchText: buildSearchText(product, variation),
                })
            }
        }

        return options
    }, [effectiveStoreID, initialProducts])

    const availableOptions = useMemo(
        () => storeOptions.filter((option) => option.stockQuantity > 0),
        [storeOptions],
    )

    const normalizedQuery = useMemo(() => normalizeSearchText(productInput), [productInput])

    const searchResults = useMemo(() => {
        if (normalizedQuery.length < 2) return []

        const tokens = normalizedQuery.split(" ").filter(Boolean)
        if (tokens.length === 0) return []

        return availableOptions
            .filter((option) => tokens.every((token) => option.searchText.includes(token)))
            .slice(0, 20)
    }, [availableOptions, normalizedQuery])

    const addSearchOption = async (option: SearchOption) => {
        const variationWithQuantity: IVariationWithQuantity = {
            ...option.variation,
            quantity: 1,
            stockQuantity: option.stockQuantity,
        }

        try {
            const check = await getPriceCheck(option.storeProduct.storeProductID)
            addProduct(option.product, variationWithQuantity, option.storeProduct, check.finalPrice, check.activeOffer)
        } catch {
            addProduct(option.product, variationWithQuantity, option.storeProduct)
        }

        setProductCode("")
    }

    const handleSetInputValue = (e: ChangeEvent<HTMLInputElement>) => {
        setProductCode(e.target.value)
    }

    const handleEnterPressed = async (e: KeyboardEvent<HTMLInputElement>) => {
        const isEnterPress = e.key === "Enter" || e.key === "NumpadEnter"
        if (!isEnterPress) return

        e.preventDefault()

        if (!effectiveStoreID) {
            toast.error("No hay tienda seleccionada")
            return
        }

        const query = productInput.trim()
        if (!query) return

        const exactAssignedSku = storeOptions.find((option) => normalizeSku(option.variation.sku) === normalizeSku(query))
        if (exactAssignedSku && exactAssignedSku.stockQuantity <= 0) {
            toast.error("El producto existe, pero no tiene stock en la tienda seleccionada")
            return
        }

        const exactAvailableSku = availableOptions.find(
            (option) => normalizeSku(option.variation.sku) === normalizeSku(query),
        )
        if (exactAvailableSku) {
            await addSearchOption(exactAvailableSku)
            return
        }

        if (searchResults.length === 1) {
            await addSearchOption(searchResults[0])
            return
        }

        if (searchResults.length > 1) {
            toast.message("Selecciona una talla de la lista")
            return
        }

        toast.error(`No se encontro producto con stock: ${query}`)
    }

    const shouldShowResults = normalizedQuery.length >= 2 && productInput.trim() !== ""

    return (
        <>
            <form
                className="mb-3 flex items-center gap-2"
                onSubmit={(e) => {
                    e.preventDefault()
                }}
            >
                <div className="relative w-full">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500" />
                    <Input
                        type="text"
                        value={productInput}
                        onChange={handleSetInputValue}
                        onKeyDown={handleEnterPressed}
                        placeholder="Código de barras o nombre del producto..."
                        className="h-12 rounded-lg border-slate-200 bg-white pl-11 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950"
                        autoFocus
                    />
                </div>
            </form>
            {shouldShowResults && (
                <div className="relative">
                    <ul className="absolute -top-6 left-0 w-full max-w-xl bg-white dark:bg-slate-700 border rounded-lg shadow mt-2 max-h-72 overflow-y-auto z-50">
                        {searchResults.length > 0 ? (
                            searchResults.map((option) => (
                                <li key={`${option.product.productID}-${option.variation.variationID}`}>
                                    <button
                                        type="button"
                                        onClick={() => addSearchOption(option)}
                                        className="w-full p-3 text-left hover:bg-blue-100 dark:hover:bg-slate-600 cursor-pointer transition"
                                    >
                                        <span className="block text-sm font-medium text-slate-900 dark:text-white">
                                            {option.product.name} - {option.variation.sizeNumber}
                                        </span>
                                        <span className="block text-xs text-slate-500 dark:text-slate-300">
                                            SKU {option.variation.sku} - Stock {option.stockQuantity}
                                        </span>
                                    </button>
                                </li>
                            ))
                        ) : (
                            <li className="p-3 text-sm text-slate-500 dark:text-slate-300">
                                Sin productos con stock para esta busqueda
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </>
    )
}
