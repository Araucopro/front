"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, Plus, Package } from "lucide-react"
import { useProductFormStore } from "@/stores/product-form.store"
import { upsertProductsBulk } from "@/actions/products/upsertProductsBulk"
import { ExcelImporter } from "./ExcelImporter"
import { ProductCard } from "./ProductCard"
import type { ICategory } from "@/interfaces/categories/ICategory"
import { useTienda } from "@/stores/tienda.store"
import { BULK_PRODUCT_BATCH_SIZE, type IBulkProductItem } from "@/interfaces/products/IBulkProduct"

type BulkProgress = {
    currentBatch: number
    totalBatches: number
    processedProducts: number
    totalProducts: number
    status: "processing" | "failed" | "complete"
    error?: string
}

const PRODUCTS_PER_FORM_PAGE = 10

const findCategoryNameByID = (categories: ICategory[], categoryID: string): string => {
    for (const category of categories) {
        if (category.categoryID === categoryID) return category.name
        const subcategoryName = findCategoryNameByID(category.subcategories ?? [], categoryID)
        if (subcategoryName) return subcategoryName
    }
    return ""
}

export default function CreateProductForm({
    categories,
    initialStoreID,
}: {
    categories: ICategory[]
    initialStoreID?: string
}) {
    const router = useRouter()
    const { storeSelected } = useTienda()
    const [isUploading, setIsUploading] = useState(false)
    const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null)
    const [formPage, setFormPage] = useState(1)
    const { products, errors, addProduct, setProducts, resetForm } = useProductFormStore()
    const storeID = initialStoreID ?? storeSelected?.storeID
    const inventoryRoute = storeID ? `/home/inventory?storeID=${storeID}` : "/home/inventory"
    const totalBatches = Math.ceil(products.length / BULK_PRODUCT_BATCH_SIZE)
    const totalFormPages = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_FORM_PAGE))
    const firstVisibleProductIndex = (formPage - 1) * PRODUCTS_PER_FORM_PAGE
    const visibleProducts = products.slice(
        firstVisibleProductIndex,
        firstVisibleProductIndex + PRODUCTS_PER_FORM_PAGE,
    )

    useEffect(() => {
        return () => {
            resetForm()
        }
    }, [resetForm])

    useEffect(() => {
        setFormPage((current) => Math.min(current, totalFormPages))
    }, [totalFormPages])

    const handleAddProduct = () => {
        const nextProductCount = products.length + 1
        addProduct()
        setFormPage(Math.ceil(nextProductCount / PRODUCTS_PER_FORM_PAGE))
    }

    const hasErrors = (errs: any[]) => {
        return errs.some((err) => err.name || err.category || err.sizes.some((e: any) => Object.keys(e).length > 0))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        useProductFormStore.getState().validate() // Run validation
        const currentErrors = useProductFormStore.getState().errors

        if (products.length === 0) {
            toast.error("Agrega o importa al menos un producto.")
            return
        }

        if (hasErrors(currentErrors)) {
            toast.error("Corrige los errores antes de guardar.")
            return
        }

        const items: IBulkProductItem[] = products.map((product) => ({
            name: product.name.trim(),
            categoryName: product.categoryName?.trim() || findCategoryNameByID(categories, product.categoryID),
            ...(product.image.trim() ? { image: product.image.trim() } : {}),
            brand: product.brand,
            genre: product.genre,
            variations: product.sizes.map((size) => ({
                sku: size.sku.trim(),
                priceCost: Number(size.priceCost),
                priceList: Number(size.priceList),
                stock: Number(size.stockQuantity),
                ...(size.sizeNumber.trim() ? { size: size.sizeNumber.trim() } : {}),
            })),
        }))

        const batches = Array.from({ length: Math.ceil(items.length / BULK_PRODUCT_BATCH_SIZE) }, (_, index) =>
            items.slice(index * BULK_PRODUCT_BATCH_SIZE, (index + 1) * BULK_PRODUCT_BATCH_SIZE),
        )
        let processedProducts = 0

        setIsUploading(true)
        setBulkProgress({
            currentBatch: 1,
            totalBatches: batches.length,
            processedProducts: 0,
            totalProducts: items.length,
            status: "processing",
        })

        try {
            for (let index = 0; index < batches.length; index++) {
                setBulkProgress({
                    currentBatch: index + 1,
                    totalBatches: batches.length,
                    processedProducts,
                    totalProducts: items.length,
                    status: "processing",
                })

                const result = await upsertProductsBulk({ items: batches[index] })
                if (!result.success) {
                    const message = result.error || "Error al guardar productos."
                    setBulkProgress({
                        currentBatch: index + 1,
                        totalBatches: batches.length,
                        processedProducts,
                        totalProducts: items.length,
                        status: "failed",
                        error: message,
                    })
                    toast.error(`Carga detenida en el lote ${index + 1} de ${batches.length}.`, {
                        description: `${processedProducts} productos fueron procesados antes del error. ${message}`,
                        duration: 12000,
                    })
                    return
                }

                processedProducts += result.productsCreatedOrUpdated
                setBulkProgress({
                    currentBatch: index + 1,
                    totalBatches: batches.length,
                    processedProducts,
                    totalProducts: items.length,
                    status: "processing",
                })
            }

            setBulkProgress({
                currentBatch: batches.length,
                totalBatches: batches.length,
                processedProducts,
                totalProducts: items.length,
                status: "complete",
            })
            toast.success(`Carga masiva completada: ${processedProducts} productos creados o actualizados.`)
            router.push(inventoryRoute)
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="lg:p-8">
            <div className="flex justify-end mb-4">
                <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setProducts([])}
                    disabled={products.length === 0 || isUploading}
                >
                    Eliminar todos los productos
                </Button>
            </div>
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-6">
                        <Button
                            onClick={() => router.push(inventoryRoute)}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-slate-700"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Volver al inventario
                        </Button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-slate-700">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                <Package className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="lg:text-3xl text-xl font-bold text-gray-900 dark:text-white">
                                    Crear o actualizar productos
                                </h1>
                                <p className="text-gray-600 lg:text-base text-xs dark:text-gray-300 mt-1">
                                    Los productos se procesan automáticamente en lotes de hasta {BULK_PRODUCT_BATCH_SIZE}
                                </p>
                            </div>
                        </div>

                        <div className="flex lg:flex-row flex-col items-center gap-6 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span>
                                    {products.length} producto{products.length !== 1 ? "s" : ""}
                                    {products.length > 0 && ` · ${totalBatches} lote${totalBatches === 1 ? "" : "s"}`}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span>
                                    {products.reduce((acc, p) => acc + p.sizes.length, 0)} variante
                                    {products.reduce((acc, p) => acc + p.sizes.length, 0) !== 1 ? "s" : ""}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <ExcelImporter categories={categories} disabled={isUploading} />

                {bulkProgress && (
                    <div
                        className={`mb-6 rounded-xl border p-4 ${
                            bulkProgress.status === "failed"
                                ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                                : bulkProgress.status === "complete"
                                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20"
                                  : "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20"
                        }`}
                    >
                        <div className="flex items-center justify-between gap-4 text-sm font-semibold">
                            <span>
                                {bulkProgress.status === "failed"
                                    ? "Carga detenida"
                                    : bulkProgress.status === "complete"
                                      ? "Carga completada"
                                      : `Procesando lote ${bulkProgress.currentBatch} de ${bulkProgress.totalBatches}`}
                            </span>
                            <span>
                                {bulkProgress.processedProducts} / {bulkProgress.totalProducts} productos
                            </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-slate-800">
                            <div
                                className={`h-full rounded-full transition-[width] ${
                                    bulkProgress.status === "failed"
                                        ? "bg-red-500"
                                        : bulkProgress.status === "complete"
                                          ? "bg-emerald-500"
                                          : "bg-blue-600"
                                }`}
                                style={{
                                    width: `${Math.min(
                                        (bulkProgress.processedProducts / Math.max(bulkProgress.totalProducts, 1)) * 100,
                                        100,
                                    )}%`,
                                }}
                            />
                        </div>
                        {bulkProgress.error && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{bulkProgress.error}</p>}
                    </div>
                )}

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl p-8">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                        <Button
                            type="button"
                            onClick={handleAddProduct}
                            disabled={isUploading}
                            className="flex items-center gap-3 px-8 py-4 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            <Plus className="w-5 h-5" />
                            Agregar otro producto
                        </Button>

                        <Button
                            type="submit"
                            disabled={isUploading || products.length === 0 || hasErrors(errors)}
                            onClick={handleSubmit}
                            className={`flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                                isUploading || products.length === 0 || hasErrors(errors)
                                    ? "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
                                    : "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 hover:from-green-600 hover:via-emerald-600 hover:to-teal-700 text-white"
                            }`}
                        >
                            {isUploading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Lote {bulkProgress?.currentBatch ?? 1} de {bulkProgress?.totalBatches ?? totalBatches}...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Procesar carga masiva
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="space-y-8 overflow-y-auto mt-8" style={{ maxHeight: "60vh", minHeight: "200px" }}>
                    {visibleProducts.map((product, visibleIndex) => {
                        const productIndex = firstVisibleProductIndex + visibleIndex
                        return (
                        <ProductCard
                            key={product.tempId || productIndex}
                            productIndex={productIndex}
                            product={product}
                            categories={categories}
                            error={errors[productIndex]}
                        />
                        )
                    })}
                </div>

                {products.length > PRODUCTS_PER_FORM_PAGE && (
                    <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Revisando productos {firstVisibleProductIndex + 1}–
                            {Math.min(firstVisibleProductIndex + PRODUCTS_PER_FORM_PAGE, products.length)} de {products.length}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={formPage === 1 || isUploading}
                                onClick={() => setFormPage((current) => Math.max(1, current - 1))}
                            >
                                Anterior
                            </Button>
                            <span className="min-w-24 text-center text-sm font-medium">
                                Página {formPage} de {totalFormPages}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={formPage === totalFormPages || isUploading}
                                onClick={() => setFormPage((current) => Math.min(totalFormPages, current + 1))}
                            >
                                Siguiente
                            </Button>
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl p-8 mt-8">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                        <Button
                            type="button"
                            onClick={handleAddProduct}
                            disabled={isUploading}
                            className="flex items-center gap-3 px-8 py-4 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            <Plus className="w-5 h-5" />
                            Agregar otro producto
                        </Button>

                        <Button
                            type="submit"
                            disabled={isUploading || products.length === 0 || hasErrors(errors)}
                            onClick={handleSubmit}
                            className={`flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                                isUploading || products.length === 0 || hasErrors(errors)
                                    ? "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
                                    : "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 hover:from-green-600 hover:via-emerald-600 hover:to-teal-700 text-white"
                            }`}
                        >
                            {isUploading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Lote {bulkProgress?.currentBatch ?? 1} de {bulkProgress?.totalBatches ?? totalBatches}...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Procesar carga masiva
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
