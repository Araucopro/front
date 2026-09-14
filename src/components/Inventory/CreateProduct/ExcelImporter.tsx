"use client"

import * as XLSX from "xlsx"
import React, { useRef, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useProductFormStore } from "@/stores/product-form.store"
import { findCategoryIdByName, generateRandomSku } from "@/utils/product-form.utils"
import type { CreateProductFormData } from "@/interfaces/products/ICreateProductForm"
import type { ICategory } from "@/interfaces/categories/ICategory"
import { Brand, Genre } from "@/interfaces/products/IProduct"

const REQUIRED_COLUMNS = [
    "Producto",
    "Género",
    "Marca",
    "Categoría",
    "Talla",
    "Precio Costo Neto",
    "Precio Plaza",
    "Código EAN",
    "Cantidad",
]

const normalizeExcelText = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim()

function validateExcelRows(rows: any[]): string | null {
    if (!rows.length) return "El archivo está vacío."
    const cols = Object.keys(rows[0])
    for (const col of REQUIRED_COLUMNS) {
        if (!cols.includes(col)) return `Falta la columna obligatoria: ${col}`
    }
    const ALLOW_EMPTY = ["Género", "Marca", "Categoría", "Talla", "Código EAN"]
    const skuRows = new Map<string, number>()

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        for (const col of REQUIRED_COLUMNS) {
            if (ALLOW_EMPTY.includes(col)) continue
            if (normalizeExcelText(row[col]) === "") {
                return `Fila ${i + 2}: Falta valor en columna "${col}".`
            }
        }
        if (isNaN(Number(row["Precio Costo Neto"])) || isNaN(Number(row["Precio Plaza"]))) {
            return `Fila ${i + 2}: Precio inválido.`
        }
        if (isNaN(Number(row["Cantidad"]))) {
            return `Fila ${i + 2}: Stock central inválido.`
        }

        const sku = normalizeExcelText(row["Código EAN"])
        if (sku) {
            const previousRow = skuRows.get(sku)
            if (previousRow) {
                return `Fila ${i + 2}: Código EAN duplicado (${sku}). Ya aparece en la fila ${previousRow}.`
            }
            skuRows.set(sku, i + 2)
        }
    }
    return null
}

export function ExcelImporter({ categories, disabled = false }: { categories: ICategory[]; disabled?: boolean }) {
    const setProducts = useProductFormStore((state) => state.setProducts)
    const dropRef = useRef<HTMLDivElement>(null)

    const handleExcelImport = useCallback(
        async (file: File) => {
            if (disabled) return
            try {
                const data = await file.arrayBuffer()
                const workbook = XLSX.read(data)
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]
                const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" })

                const error = validateExcelRows(json)
                if (error) {
                    toast.error(error)
                    return
                }

                const productMap = new Map<string, CreateProductFormData>()

                for (const row of json) {
                    const genre = (normalizeExcelText(row["Género"]) || "Unisex") as Genre
                    const brand = (normalizeExcelText(row["Marca"]) || "Otro") as Brand
                    const categoryName = normalizeExcelText(row["Categoría"]) || "Otro"
                    const catId = findCategoryIdByName(categories, categoryName)

                    const defaultImage = ""
                    const image = normalizeExcelText(row["Imagen"]) || defaultImage
                    const productName = normalizeExcelText(row["Producto"])
                    const key = normalizeExcelText(productName).toLocaleLowerCase("es-CL")
                    const sku = normalizeExcelText(row["Código EAN"]) || generateRandomSku()

                    const size = {
                        sizeNumber: normalizeExcelText(row["Talla"]),
                        priceList: Number(row["Precio Plaza"]),
                        priceCost: Number(row["Precio Costo Neto"]),
                        sku,
                        stockQuantity: Number(row["Cantidad"]),
                        tempId: Math.random().toString(36).substring(7),
                    }

                    if (productMap.has(key)) {
                        const existingProduct = productMap.get(key)!
                        const hasConflictingData =
                            normalizeExcelText(existingProduct.categoryName).toLocaleLowerCase("es-CL") !==
                                categoryName.toLocaleLowerCase("es-CL") ||
                            normalizeExcelText(existingProduct.brand).toLocaleLowerCase("es-CL") !==
                                normalizeExcelText(brand).toLocaleLowerCase("es-CL") ||
                            existingProduct.genre !== genre

                        if (hasConflictingData) {
                            toast.error(
                                `El producto "${productName}" aparece con distinta categoría, marca o género. Unifica sus datos en el Excel.`,
                            )
                            return
                        }
                        existingProduct.sizes.push(size)
                    } else {
                        productMap.set(key, {
                            name: productName,
                            image,
                            categoryID: catId,
                            categoryName,
                            genre,
                            brand,
                            sizes: [size],
                            tempId: Math.random().toString(36).substring(7),
                        })
                    }
                }

                const importedProducts: CreateProductFormData[] = Array.from(productMap.values())
                setProducts(importedProducts)

                toast.success("Productos importados desde Excel.")
            } catch (err) {
                toast.error("Error al procesar el archivo Excel.")
            }
        },
        [categories, disabled, setProducts],
    )

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleExcelImport(file)
    }

    useEffect(() => {
        const drop = dropRef.current
        if (!drop) return

        const handleDrop = (e: DragEvent) => {
            e.preventDefault()
            if (e.dataTransfer?.files?.length) {
                const file = e.dataTransfer.files[0]
                if (file.name.endsWith(".xlsx")) {
                    handleExcelImport(file)
                } else {
                    toast.error("Solo se permiten archivos .xlsx")
                }
            }
        }

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault()
        }

        drop.addEventListener("drop", handleDrop)
        drop.addEventListener("dragover", handleDragOver)

        return () => {
            drop.removeEventListener("drop", handleDrop)
            drop.removeEventListener("dragover", handleDragOver)
        }
    }, [handleExcelImport])

    return (
        <div
            ref={dropRef}
            className={`mb-6 flex flex-col items-start gap-4 rounded-xl border-2 border-dashed p-4 transition-colors lg:flex-row ${
                disabled
                    ? "cursor-not-allowed border-slate-300 bg-slate-100 opacity-60 dark:border-slate-700 dark:bg-slate-900"
                    : "cursor-pointer border-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/10 dark:hover:bg-blue-900/20"
            }`}
            style={{ minHeight: 80 }}
        >
            <div className="flex-1 flex flex-col gap-2">
                <Label className="font-semibold text-gray-700 dark:text-gray-300">
                    Importar productos desde Excel (.xlsx):
                </Label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    Arrastra y suelta el archivo aquí o haz clic para seleccionarlo.
                </span>
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    Los archivos grandes se dividen automáticamente en lotes de 100 productos; las variantes no cuentan como productos adicionales.
                </span>
            </div>
            <Input
                type="file"
                accept=".xlsx"
                onChange={handleFileInput}
                disabled={disabled}
                className="max-w-xs"
                style={{ display: "block" }}
            />
        </div>
    )
}
