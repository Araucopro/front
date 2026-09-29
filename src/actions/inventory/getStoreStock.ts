import { fetcher } from "@/lib/fetcher"
import { API_URL } from "@/lib/enviroments"
import { IStoreProduct } from "@/interfaces/products/IProductVariation"
import type { IProduct } from "@/interfaces/products/IProduct"
import type { ICategory } from "@/interfaces/categories/ICategory"
import type { IStore } from "@/interfaces/stores/IStore"
import type { IProductVariationRaw, IRawProduct, IStoreProductRaw } from "@/interfaces/products/IRawProduct"
import { normalizeProduct, normalizeStoreProductList, type RawStoreProduct } from "@/lib/normalize-product"

type RawCategoryFromStock = Partial<ICategory> & {
    children?: RawCategoryFromStock[]
}

type RawProductFromStock = {
    productID?: string
    image?: string
    categoryID?: string | null
    category?: RawCategoryFromStock | null
    Category?: RawCategoryFromStock | null
    name?: string
    slug?: string
    brand?: string
    genre?: IRawProduct["genre"]
    description?: string | null
    variations?: RawVariationFromStock[]
    ProductVariations?: RawVariationFromStock[]
    createdAt?: string
    updatedAt?: string
    wooID?: number | null
    totalProducts?: number
}

type RawVariationFromStock = {
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
    product?: RawProductFromStock | null
    Product?: RawProductFromStock | null
    storeProducts?: RawStoreProductFromStock[]
    StoreProducts?: RawStoreProductFromStock[]
}

type RawStoreProductFromStock = RawStoreProduct & {
    store?: IStore | null
    Store?: IStore | null
    variation?: RawVariationFromStock | null
    Variation?: RawVariationFromStock | null
    product?: RawProductFromStock | null
    Product?: RawProductFromStock | null
}

const toNumber = (value: unknown): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

const normalizeCategory = (category?: RawCategoryFromStock | null): ICategory | null => {
    if (!category) return null
    const subcategories =
        category.subcategories ??
        category.children?.map(normalizeCategory).filter((item): item is ICategory => item !== null)

    return {
        categoryID: category.categoryID ?? "",
        name: category.name ?? "",
        parentID: category.parentID ?? "",
        createdAt: category.createdAt ?? "",
        updatedAt: category.updatedAt ?? "",
        subcategories,
    }
}

const buildStoreProduct = (
    raw: RawStoreProductFromStock,
    fallbackStoreID: string,
    variationID: string,
): IStoreProductRaw => {
    const store = raw.store ?? raw.Store ?? undefined

    return {
        storeProductID: raw.storeProductID ?? "",
        variationID,
        storeID: raw.storeID ?? store?.storeID ?? fallbackStoreID,
        stock: toNumber(raw.stock),
        priceCost: toNumber(raw.priceCost),
        priceList: toNumber(raw.priceList),
        createdAt: raw.createdAt ?? "",
        updatedAt: raw.updatedAt ?? "",
        store,
        Store: store,
    }
}

const buildProduct = (raw: RawProductFromStock): IRawProduct => {
    const category = normalizeCategory(raw.category ?? raw.Category)

    return {
        productID: raw.productID ?? "",
        image: raw.image ?? "",
        categoryID: raw.categoryID ?? category?.categoryID ?? null,
        category,
        name: raw.name ?? "",
        slug: raw.slug ?? "",
        brand: raw.brand ?? "Otro",
        genre: raw.genre ?? "Unisex",
        description: raw.description ?? null,
        variations: [],
        createdAt: raw.createdAt ?? "",
        updatedAt: raw.updatedAt ?? "",
        wooID: raw.wooID ?? null,
        totalProducts: raw.totalProducts ?? 0,
    }
}

const buildVariation = (
    raw: RawVariationFromStock,
    productID: string,
    storeProduct: IStoreProductRaw,
): IProductVariationRaw => ({
    variationID: raw.variationID ?? storeProduct.variationID,
    productID: raw.productID ?? productID,
    sku: raw.sku ?? "",
    variation: raw.variation ?? raw.size ?? "",
    subVariation: raw.subVariation ?? raw.color ?? "",
    supplierSku: raw.supplierSku ?? null,
    barcode: raw.barcode ?? null,
    size: raw.variation ?? raw.size ?? "",
    color: raw.color ?? null,
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
    storeProducts: [storeProduct],
    StoreProducts: [storeProduct],
})

const mapStoreStockToProducts = (items: RawStoreProductFromStock[], storeID: string): IRawProduct[] => {
    const productsById = new Map<string, IRawProduct>()

    for (const item of items) {
        const variation = item.variation ?? item.Variation
        const product = variation?.product ?? variation?.Product ?? item.product ?? item.Product
        const productID = product?.productID ?? variation?.productID
        const variationID = variation?.variationID ?? item.variationID

        if (!product || !productID || !variation || !variationID) continue

        const storeProduct = buildStoreProduct(item, storeID, variationID)
        const existingProduct = productsById.get(productID)

        if (!existingProduct) {
            const mappedProduct = buildProduct(product)
            mappedProduct.variations.push(buildVariation(variation, productID, storeProduct))
            productsById.set(productID, mappedProduct)
            continue
        }

        const existingVariation = existingProduct.variations.find((entry) => entry.variationID === variationID)

        if (existingVariation) {
            existingVariation.storeProducts.push(storeProduct)
            existingVariation.StoreProducts = existingVariation.storeProducts
        } else {
            existingProduct.variations.push(buildVariation(variation, productID, storeProduct))
        }
    }

    return Array.from(productsById.values())
}

/**
 * Obtiene el stock de inventario de una tienda específica.
 * GET /inventory/store/{storeID}
 *
 * @param storeID - ID de la tienda.
 * @returns Promesa con el stock por variación de la tienda.
 */
export async function getStoreStock(storeID: string): Promise<IStoreProduct[]> {
    const items = await fetcher<RawStoreProduct[]>(`${API_URL}/inventory/store/${storeID}`)
    return Array.isArray(items) ? normalizeStoreProductList(items) : []
}

export async function getStoreStockProducts(storeID: string): Promise<IRawProduct[]> {
    const items = await fetcher<RawStoreProductFromStock[]>(`${API_URL}/inventory/store/${storeID}`)
    return Array.isArray(items) ? mapStoreStockToProducts(items, storeID) : []
}

export async function getStoreStockSaleProducts(
    storeID: string,
    options: { includeOutOfStock?: boolean } = {},
): Promise<IProduct[]> {
    const rawProducts = await getStoreStockProducts(storeID)

    return rawProducts
        .map(normalizeProduct)
        .map((product) => {
            const ProductVariations = product.ProductVariations.filter((variation) => {
                const storeProduct = variation.StoreProducts?.find((item) => item.storeID === storeID)
                return Boolean(storeProduct) && (options.includeOutOfStock || (storeProduct?.quantity ?? 0) > 0)
            })

            return {
                ...product,
                ProductVariations,
                stock: ProductVariations.reduce((sum, variation) => sum + variation.stockQuantity, 0),
            }
        })
        .filter((product) => product.ProductVariations.length > 0)
}
