// src/interfaces/products/ICreateProductForm.ts

export interface Size {
    tempId?: string
    sizeNumber: string
    priceList: number
    priceCost: number
    sku: string
    stockQuantity: number
    subVariation?: string
    supplierSku?: string
    barcode?: string
}

export interface CreateProductFormData {
    tempId?: string
    name: string
    image: string
    categoryID: string
    categoryName?: string
    description?: string
    slug?: string
    genre: "Hombre" | "Mujer" | "Unisex"
    brand: string
    sizes: Size[]
}

export interface MassiveCreateProductData {
    products: CreateProductFormData[]
}

export interface ErrorState {
    category: string
    name?: string
    image?: string
    genre?: string
    sizes: Record<string, string>[]
}
