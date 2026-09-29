"use client"

import * as XLSX from "xlsx"
import React, { useRef, useEffect, useCallback, useState } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useProductFormStore } from "@/stores/product-form.store"
import { normalize } from "@/utils/product-form.utils"
import type { CreateProductFormData } from "@/interfaces/products/ICreateProductForm"
import type { ICategory } from "@/interfaces/categories/ICategory"
import { Brand, Genre } from "@/interfaces/products/IProduct"
import { createCategory } from "@/actions/categories/createCategory"

const REQUIRED_COLUMNS = [
    "Producto",
    "Género",
    "Marca",
    "Variante",
    "Precio Costo Neto",
    "Precio Plaza",
    "Cantidad",
]

const normalizeExcelText = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim()
const excelValue = (row: Record<string, unknown>, ...columns: string[]) =>
    normalizeExcelText(columns.map((column) => row[column]).find((value) => normalizeExcelText(value)))
const normalizeRow = (row: Record<string, unknown>): Record<string, unknown> => ({
    ...row,
    "Género": excelValue(row, "Género", "Genero"),
    "Categoría": excelValue(row, "Categoría", "Categoría padre"),
    "Subcategoría": excelValue(row, "Subcategoría"),
    Variante: excelValue(row, "Variante", "Talla"),
    Subvariante: excelValue(row, "Subvariante"),
    "SKU Tienda": excelValue(row, "SKU Tienda", "SKU"),
    "SKU Proveedor": excelValue(row, "SKU Proveedor"),
    "Código EAN": excelValue(row, "Código EAN"),
    "Descripcion del producto": excelValue(row, "Descripcion del producto", "Descripción del producto", "Descripción"),
    Imagen: excelValue(row, "Imagen"),
    Slug: excelValue(row, "Slug"),
})

type CategoryWithChildren = ICategory & { children?: ICategory[] }

const getCategoryChildren = (category: ICategory): ICategory[] =>
    category.subcategories ?? (category as CategoryWithChildren).children ?? []

const cloneCategoryTree = (categories: ICategory[]): ICategory[] =>
    categories.map((category) => ({
        ...category,
        subcategories: cloneCategoryTree(getCategoryChildren(category)),
    }))

const findCategoryByName = (categories: ICategory[], name: string): ICategory | null => {
    const normalizedName = normalize(name)

    for (const category of categories) {
        if (normalize(category.name) === normalizedName) return category

        const child = findCategoryByName(getCategoryChildren(category), name)
        if (child) return child
    }

    return null
}

const findRootCategoryByName = (categories: ICategory[], name: string): ICategory | null =>
    categories.find((category) => normalize(category.name) === normalize(name)) ?? null

const normalizeCreatedCategory = (category: ICategory, parentID = ""): ICategory => ({
    ...category,
    parentID: category.parentID || parentID,
    subcategories: getCategoryChildren(category),
})

const ensureRootCategory = async (
    categories: ICategory[],
    name: string,
    onCreated: () => void,
): Promise<ICategory> => {
    const existing = findRootCategoryByName(categories, name)
    if (existing) return existing

    try {
        const created = normalizeCreatedCategory(await createCategory(name))
        categories.push(created)
        onCreated()
        return created
    } catch (error) {
        throw new Error(`No se pudo crear la categoría "${name}".`)
    }
}

const ensureSubcategory = async (
    parent: ICategory,
    name: string,
    onCreated: () => void,
): Promise<ICategory> => {
    const existing = getCategoryChildren(parent).find((category) => normalize(category.name) === normalize(name))
    if (existing) return existing

    try {
        const created = normalizeCreatedCategory(await createCategory(name, parent.categoryID), parent.categoryID)
        parent.subcategories = [...getCategoryChildren(parent), created]
        onCreated()
        return created
    } catch (error) {
        throw new Error(`No se pudo crear la subcategoría "${name}" dentro de "${parent.name}".`)
    }
}

const resolveExcelCategory = async (
    row: any,
    usesHierarchyColumns: boolean,
    categories: ICategory[],
    onCreated: () => void,
): Promise<{ category: ICategory; usedOther: boolean }> => {
    if (usesHierarchyColumns) {
        const parentName = normalizeExcelText(row["Categoría"])
        const subcategoryName = normalizeExcelText(row["Subcategoría"])

        if (!parentName) {
            return {
                category: await ensureRootCategory(categories, "Otro", onCreated),
                usedOther: true,
            }
        }

        const parent = await ensureRootCategory(categories, parentName, onCreated)
        return {
            category: subcategoryName ? await ensureSubcategory(parent, subcategoryName, onCreated) : parent,
            usedOther: false,
        }
    }

    const legacyCategoryName = normalizeExcelText(row["Categoría"])
    if (!legacyCategoryName) {
        return {
            category: await ensureRootCategory(categories, "Otro", onCreated),
            usedOther: true,
        }
    }

    const existing = findCategoryByName(categories, legacyCategoryName)
    return {
        category: existing ?? (await ensureRootCategory(categories, legacyCategoryName, onCreated)),
        usedOther: false,
    }
}

function validateExcelRows(rows: Record<string, unknown>[]): string | null {
    if (!rows.length) return "El archivo está vacío."
    const ALLOW_EMPTY = ["Género", "Marca", "Variante"]
    const skuRows = new Map<string, number>()
    const productsByName = new Map<string, { row: number; fields: string }>()

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const productKey = normalizeExcelText(row["Producto"]).toLocaleLowerCase("es-CL")
        const productFields = ["Categoría", "Subcategoría", "Marca", "Género", "Slug", "Descripcion del producto", "Imagen"]
            .map((column) => normalizeExcelText(row[column]).toLocaleLowerCase("es-CL"))
            .join("\u0000")
        const previousProduct = productsByName.get(productKey)
        if (previousProduct && previousProduct.fields !== productFields) {
            return `Fila ${i + 2}: "${row["Producto"]}" tiene datos distintos a la fila ${previousProduct.row}. El API identifica productos por nombre: unifica sus datos o usa nombres únicos.`
        }
        productsByName.set(productKey, { row: i + 2, fields: productFields })
        for (const col of REQUIRED_COLUMNS) {
            if (ALLOW_EMPTY.includes(col)) continue
            if (normalizeExcelText(row[col]) === "") {
                return `Fila ${i + 2}: Falta valor en columna "${col}".`
            }
        }
        if (Number(row["Precio Costo Neto"]) < 0 || Number(row["Precio Plaza"]) < 0 ||
            isNaN(Number(row["Precio Costo Neto"])) || isNaN(Number(row["Precio Plaza"]))) {
            return `Fila ${i + 2}: Precio inválido.`
        }
        if (isNaN(Number(row["Cantidad"])) || Number(row["Cantidad"]) < 0) {
            return `Fila ${i + 2}: Stock central inválido.`
        }

        const sku = excelValue(row, "SKU Tienda", "Código EAN")
        if (!sku) return `Fila ${i + 2}: falta SKU Tienda o Código EAN; el backend exige un SKU.`
        const previousRow = skuRows.get(sku)
        if (previousRow) {
            return `Fila ${i + 2}: SKU ${sku} duplicado. Ya aparece en la fila ${previousRow}.`
        }
        skuRows.set(sku, i + 2)
    }
    return null
}

interface ExcelImporterProps {
    categories: ICategory[]
    disabled?: boolean
    onCategoriesChange?: (categories: ICategory[]) => void
}

export function ExcelImporter({ categories, disabled = false, onCategoriesChange }: ExcelImporterProps) {
    const setProducts = useProductFormStore((state) => state.setProducts)
    const dropRef = useRef<HTMLDivElement>(null)
    const [isImporting, setIsImporting] = useState(false)
    const inputDisabled = disabled || isImporting

    const handleExcelImport = useCallback(
        async (file: File) => {
            if (inputDisabled) return
            let workingCategories: ICategory[] | null = null
            let createdCategories = 0

            setIsImporting(true)
            try {
                const data = await file.arrayBuffer()
                const workbook = XLSX.read(data)
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]
                const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" })
                const columns = Object.keys(rawRows[0] ?? {})
                const hasVariation = columns.includes("Variante") || columns.includes("Talla")
                const hasSku = columns.includes("SKU Tienda") || columns.includes("SKU") || columns.includes("Código EAN")
                const missingColumn = REQUIRED_COLUMNS.find((column) =>
                    column === "Variante" ? !hasVariation : !columns.includes(column))
                if (missingColumn || !hasSku) {
                    toast.error(`Falta la columna obligatoria: ${missingColumn || "SKU Tienda o Código EAN"}`)
                    return
                }
                const json = rawRows.map(normalizeRow)

                const error = validateExcelRows(json)
                if (error) {
                    toast.error(error)
                    return
                }

                workingCategories = cloneCategoryTree(categories)
                const usesHierarchyColumns =
                    columns.includes("Categoría padre") || columns.includes("Subcategoría")
                const productMap = new Map<string, CreateProductFormData>()
                const productsAssignedToOther = new Set<string>()
                let skusTakenFromBarcode = 0

                for (const row of json) {
                    const genre = (normalizeExcelText(row["Género"]) || "Unisex") as Genre
                    const brand = (normalizeExcelText(row["Marca"]) || "Otro") as Brand
                    const resolvedCategory = await resolveExcelCategory(
                        row,
                        usesHierarchyColumns,
                        workingCategories,
                        () => createdCategories++,
                    )
                    const categoryName = resolvedCategory.category.name
                    const catId = resolvedCategory.category.categoryID

                    const defaultImage = ""
                    const image = normalizeExcelText(row["Imagen"]) || defaultImage
                    const productName = normalizeExcelText(row["Producto"])
                    const key = normalizeExcelText(productName).toLocaleLowerCase("es-CL")
                    if (resolvedCategory.usedOther) productsAssignedToOther.add(key)
                    const barcode = normalizeExcelText(row["Código EAN"])
                    const sku = normalizeExcelText(row["SKU Tienda"]) || barcode
                    if (!normalizeExcelText(row["SKU Tienda"])) skusTakenFromBarcode++

                    const size = {
                        sizeNumber: normalizeExcelText(row["Variante"]),
                        subVariation: normalizeExcelText(row["Subvariante"]),
                        supplierSku: normalizeExcelText(row["SKU Proveedor"]),
                        barcode,
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
                            existingProduct.genre !== genre ||
                            existingProduct.slug !== normalizeExcelText(row["Slug"]) ||
                            existingProduct.description !== normalizeExcelText(row["Descripcion del producto"])

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
                            description: normalizeExcelText(row["Descripcion del producto"]),
                            slug: normalizeExcelText(row["Slug"]),
                            sizes: [size],
                            tempId: Math.random().toString(36).substring(7),
                        })
                    }
                }

                const importedProducts: CreateProductFormData[] = Array.from(productMap.values())
                if (createdCategories > 0) onCategoriesChange?.(workingCategories)
                setProducts(importedProducts)
                if (skusTakenFromBarcode > 0) {
                    toast.info(`${skusTakenFromBarcode} variantes sin SKU Tienda usarán su Código EAN como SKU.`)
                }

                toast.success(
                    createdCategories > 0
                        ? `Productos importados. Se crearon ${createdCategories} categoría(s) faltante(s).`
                        : "Productos importados desde Excel.",
                )
                if (productsAssignedToOther.size > 0) {
                    toast.warning(
                        `${productsAssignedToOther.size} producto(s) sin categoría o subcategoría se asignaron a "Otro".`,
                    )
                }
            } catch (err) {
                if (createdCategories > 0 && workingCategories) onCategoriesChange?.(workingCategories)
                toast.error(err instanceof Error ? err.message : "Error al procesar el archivo Excel.")
            } finally {
                setIsImporting(false)
            }
        },
        [categories, inputDisabled, onCategoriesChange, setProducts],
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
                inputDisabled
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
                    {isImporting
                        ? "Procesando categorías del archivo..."
                        : "Arrastra y suelta el archivo aquí o haz clic para seleccionarlo."}
                </span>
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    Los archivos grandes se dividen automáticamente en lotes de 100 productos; las variantes no cuentan como productos adicionales.
                </span>
            </div>
            <Input
                type="file"
                accept=".xlsx"
                onChange={handleFileInput}
                disabled={inputDisabled}
                className="max-w-xs"
                style={{ display: "block" }}
            />
        </div>
    )
}
