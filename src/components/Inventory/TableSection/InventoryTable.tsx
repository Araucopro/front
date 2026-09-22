"use client"

import { Tag, Trash2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Badge } from "@/components/ui/badge"
import { MotionItem } from "@/components/Animations/motionItem"
import type { IRawProduct, IProductVariationRaw } from "@/interfaces/products/IRawProduct"
import { ICategory } from "@/interfaces/categories/ICategory"
import { useAuth } from "@/stores/user.store"
import { Role } from "@/lib/userRoles"
import { inventoryStore } from "@/stores/inventory.store"
import { useTienda } from "@/stores/tienda.store"
import { SafeImage as Image } from "@/components/ui/safe-image"
import useQueryParams from "@/hooks/useQueryParams"
import { findProductBySku } from "@/utils/findProductBySku"
import { toPrice } from "@/utils/priceFormat"
import { PrintbarcodeModal } from "./PrintBarcodeModal"
import { useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { IProductVariation } from "@/interfaces/products/IProductVariation"
import type { FlattenedItem } from "@/interfaces/products/IFlatternProduct"
import type { IProduct } from "@/interfaces/products/IProduct"
import type { IStoreProduct } from "@/interfaces/products/IProductVariation"
import type { IUpdatePriceResponse } from "@/interfaces/pricing/IPricing"
import { PricingModal } from "./PricingModal"
import { getProductCategoryName } from "@/utils/categoryName"

interface InventoryTableProps {
    currentItems: FlattenedItem[]
    handleSaveEdit: (product: IRawProduct, variationID?: string) => void
    handleDeleteProduct: (product: IRawProduct) => void
    adminStoreIDs: string[]
    categories: ICategory[]
}

type PricingVariationState = {
    product: IRawProduct
    variation: IProductVariationRaw
} | null

const calculateMarkup = (priceCost: number, priceList: number): string => {
    if (priceCost === 0) return "N/A"
    const markup = priceList / priceCost
    return markup.toFixed(2)
}

export function InventoryTable({ currentItems, handleSaveEdit, handleDeleteProduct, categories }: InventoryTableProps) {
    const { user } = useAuth()
    const { editingField, setEditingField, editValue, setEditValue } = inventoryStore()
    const { storeSelected } = useTienda()
    const { searchParams } = useQueryParams()
    const storeID = storeSelected?.storeID || searchParams.get("storeID") || null
    const [openSku, setOpenSku] = useState<string | null>(null)
    const [pricingVariation, setPricingVariation] = useState<PricingVariationState>(null)
    const [revealedCostSku, setRevealedCostSku] = useState<string | null>(null)
    const printBarcodeModal = (sku: string | null) => {
        setOpenSku(sku)
    }
    const isEditable = user?.role !== Role.Vendedor && user?.role !== Role.Tercero

    return (
        <div className="flex-1 flex flex-col">
            <div className="flex-1 dark:bg-slate-900 bg-white shadow rounded-t-none overflow-hidden">
                <div className="overflow-x-auto h-full">
                    <Table>
                        <TableHeader className="sticky top-0 bg-gray-50 dark:bg-slate-800">
                            <TableRow>
                                <TableHead className="whitespace-nowrap text-center font-semibold text-gray-700 dark:text-gray-200">
                                    PRODUCTO
                                </TableHead>
                                <TableHead className="whitespace text-center font-semibold text-gray-700 dark:text-gray-200">
                                    SKU
                                </TableHead>
                                <TableHead className="whitespace-nowrap text-center font-semibold text-gray-700 dark:text-gray-200">
                                    MARCA
                                </TableHead>
                                <TableHead className="whitespace-nowrap text-center font-semibold text-gray-700 dark:text-gray-200">
                                    CATEGORÍA
                                </TableHead>
                                {/* PRECIO COSTO se muestra solo si es admin */}
                                {user?.role === Role.Admin && (
                                    <TableHead className="whitespace text-center font-semibold text-gray-700 dark:text-gray-200">
                                        COSTO NETO
                                    </TableHead>
                                )}
                                <TableHead className="whitespace text-center font-semibold text-gray-700 dark:text-gray-200">
                                    PRECIO PLAZA
                                </TableHead>
                                <TableHead className="whitespace-nowrap text-center font-semibold text-gray-700 dark:text-gray-200">
                                    TALLA
                                </TableHead>
                                <TableHead className="whitespace text-center font-semibold text-gray-700 dark:text-gray-200">
                                    {user?.role === Role.Admin ? "STOCK CENTRAL" : "STOCK TIENDA"}
                                </TableHead>
                                <TableHead className="whitespace-nowrap text-center font-semibold text-gray-700 dark:text-gray-200">
                                    Stock agregado
                                </TableHead>
                                {user?.role === Role.Admin && (
                                    <TableHead className="w-12 text-center font-semibold text-gray-700 dark:text-gray-200" />
                                )}
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {currentItems.map(({ product, variation, isFirst, totalStock }, index) => {
                                const productData = findProductBySku([product], storeID!, variation.sku)
                                const storeFilter = variation.storeProducts?.filter((sp) => !sp.store?.isCentralStore)
                                const stockAgregado =
                                    variation.storeProducts?.reduce((sum: number, sp) => {
                                        if (!sp.store?.isCentralStore) return sum + (sp.stock || 0)
                                        return sum
                                    }, 0) ?? 0

                                const currentSp =
                                    variation.storeProducts?.find((sp) => sp.storeID === storeID) ||
                                    variation.storeProducts?.[0]
                                const priceCost = currentSp?.priceCost || 0
                                const priceList = currentSp?.priceList || 0
                                const stockQuantity = currentSp?.stock || 0

                                const profitMargin = priceList > 0 ? ((priceList - priceCost) / priceList) * 100 : 0
                                return (
                                    <TableRow
                                        key={`${product.productID}-${variation.variationID}`}
                                        className={`group hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors duration-200 ${
                                            isFirst
                                                ? "border-t-2 border-t-slate-200 dark:border-t-slate-400"
                                                : "border-t border-gray-100 dark:border-gray-700"
                                        } text-sm dark:text-gray-300 text-gray-800 h-16`}
                                    >
                                        {isFirst && (
                                            <TableCell
                                                className="py-2 px-3 text-left w-1/4"
                                                rowSpan={product.variations?.length || 1}
                                            >
                                                <MotionItem key={`product-${product.productID}`} delay={index + 2}>
                                                    <div className="flex flex-col relative w-full items-center gap-4">
                                                        <div className="relative">
                                                            <div className="relative group transition-transform transform hover:scale-105">
                                                                <Image
                                                                    src={product.image}
                                                                    alt={product.name}
                                                                    width={200}
                                                                    height={200}
                                                                    className="w-48 h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                                                                    style={{ objectFit: "cover" }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-base text-center">
                                                                {product.name}
                                                            </p>
                                                            <div className="flex justify-center gap-2 mt-2">
                                                                <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full font-medium">
                                                                    {product.variations?.reduce(
                                                                        (prev: number, v: IProductVariationRaw) => {
                                                                            const vStock = v.storeProducts.reduce(
                                                                                (acc: number, sp) =>
                                                                                    acc + (sp.stock || 0),
                                                                                0,
                                                                            )
                                                                            return prev + vStock
                                                                        },
                                                                        0,
                                                                    )}{" "}
                                                                    productos
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </MotionItem>
                                            </TableCell>
                                        )}
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <TableCell
                                                    onClick={() =>
                                                        printBarcodeModal(
                                                            openSku === variation.sku ? null : variation.sku,
                                                        )
                                                    }
                                                    className="px-3 py-1 text-xs font-medium cursor-pointer"
                                                >
                                                    {variation.sku}
                                                </TableCell>
                                            </TooltipTrigger>
                                            <TooltipContent side="left" sideOffset={-10}>
                                                <p>Imprimir Etiqueta</p>
                                            </TooltipContent>
                                        </Tooltip>

                                        {productData && (
                                            <PrintbarcodeModal
                                                // El modal está abierto SÓLO si el SKU de la variación actual coincide con el estado
                                                isOpen={openSku === variation.sku}
                                                // Para cerrar el modal, simplemente pasamos 'null'
                                                onOpenChange={(newOpenState) =>
                                                    printBarcodeModal(newOpenState ? variation.sku : null)
                                                }
                                                value={productData}
                                            />
                                        )}

                                        {/* Columna MARCA */}
                                        <TableCell
                                            className={`text-center py-2 ${
                                                isEditable
                                                    ? "cursor-pointer dark:hover:bg-gray-900 hover:bg-gray-100"
                                                    : ""
                                            }`}
                                            onClick={() => {
                                                if (!isEditable) return
                                                setEditingField({ sku: product.productID, field: "brand" })
                                                setEditValue(product.brand || "")
                                            }}
                                        >
                                            {editingField?.sku === product.productID &&
                                            editingField?.field === "brand" ? (
                                                <div
                                                    className="flex justify-center"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Input
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={() => handleSaveEdit(product)}
                                                        className="w-24 h-8 px-2 py-1 text-center text-xs"
                                                        autoFocus
                                                    />
                                                </div>
                                            ) : (
                                                <MotionItem key={`brand-${product.productID}`} delay={index + 5}>
                                                    <span className="font-medium">{product.brand}</span>
                                                </MotionItem>
                                            )}
                                        </TableCell>

                                        {/* Columna CATEGORIA */}
                                        <TableCell className="text-center dark:hover:bg-gray-900 hover:bg-gray-100 py-2">
                                            {getProductCategoryName(product, categories, "-")}
                                        </TableCell>

                                        {/* Columna PRECIO COSTO se muestra solo si es admin */}
                                        {user?.role === Role.Admin && (
                                            <TableCell
                                                className={`w-32 text-center py-3 transition-colors ${
                                                    isEditable
                                                        ? "cursor-pointer dark:hover:bg-gray-800 hover:bg-gray-50"
                                                        : ""
                                                }`}
                                                onMouseEnter={() => setRevealedCostSku(variation.sku)}
                                                onMouseLeave={() => setRevealedCostSku(null)}
                                                onClick={() => {
                                                    if (!isEditable) return
                                                    setEditingField({ sku: variation.sku, field: "priceCost" })
                                                    setEditValue(String(priceCost))
                                                }}
                                            >
                                                {editingField?.sku === variation.sku &&
                                                editingField?.field === "priceCost" ? (
                                                    <div
                                                        className="flex justify-center"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <CurrencyInput
                                                            value={editValue}
                                                            onValueChange={setEditValue}
                                                            onBlur={() =>
                                                                handleSaveEdit(product, variation.variationID)
                                                            }
                                                            className="w-20 h-8 px-2 py-1 text-center text-xs"
                                                            autoFocus
                                                        />
                                                    </div>
                                                ) : (
                                                    <span
                                                        className={`font-semibold text-sm transition-[filter] duration-300 ease-out ${
                                                            revealedCostSku === variation.sku ? "blur-0" : "blur-sm"
                                                        }`}
                                                    >
                                                        ${toPrice(priceCost)}
                                                    </span>
                                                )}
                                            </TableCell>
                                        )}

                                        {/* Columna PRECIO PLAZA */}
                                        <TableCell
                                            className={`w-32 text-center py-3 transition-colors ${
                                                isEditable
                                                    ? "cursor-pointer dark:hover:bg-gray-800 hover:bg-gray-50"
                                                    : ""
                                            }`}
                                            onClick={() => {
                                                if (!isEditable) return
                                                setEditingField({ sku: variation.sku, field: "priceList" })
                                                setEditValue(String(priceList))
                                            }}
                                        >
                                            {editingField?.sku === variation.sku &&
                                            editingField?.field === "priceList" ? (
                                                <div
                                                    className="flex justify-center"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <CurrencyInput
                                                        value={editValue}
                                                        onValueChange={setEditValue}
                                                        onBlur={() => handleSaveEdit(product, variation.variationID)}
                                                        className="w-20 h-8 px-2 py-1 text-center text-xs"
                                                        autoFocus
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="font-semibold text-sm">${toPrice(priceList)}</span>
                                                    <span
                                                        className={`text-xs ${
                                                            profitMargin > 30
                                                                ? "text-green-600"
                                                                : profitMargin > 15
                                                                  ? "text-yellow-600"
                                                                  : "text-red-600"
                                                        }`}
                                                    >
                                                        Markup: {calculateMarkup(priceCost, priceList)}
                                                    </span>
                                                    {/* Botón Pricing - solo admins */}
                                                    {user?.role === Role.Admin && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setPricingVariation({ product, variation })
                                                                    }}
                                                                    className="flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                                                                >
                                                                    <Tag className="w-3 h-3" />
                                                                    Pricing
                                                                </button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Ver historial, ofertas y precio final
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>

                                        {/* Columna TALLA */}
                                        <TableCell
                                            className={`text-center py-2 ${
                                                isEditable
                                                    ? "cursor-pointer dark:hover:bg-gray-900 hover:bg-gray-100"
                                                    : ""
                                            }`}
                                            onClick={() => {
                                                if (!isEditable) return
                                                setEditingField({ sku: variation.sku, field: "sizeNumber" })
                                                setEditValue(variation.size)
                                            }}
                                        >
                                            {editingField?.sku === variation.sku &&
                                            editingField?.field === "sizeNumber" ? (
                                                <div
                                                    className="flex justify-center"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Input
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={() => handleSaveEdit(product, variation.variationID)}
                                                        className="w-16 h-8 px-2 py-1 text-center text-xs"
                                                        autoFocus
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1">
                                                    <MotionItem
                                                        key={`${product.productID}-${variation.variationID}`}
                                                        delay={index + 3}
                                                    >
                                                        <span className="font-medium">{variation.size}</span>
                                                    </MotionItem>
                                                </div>
                                            )}
                                        </TableCell>

                                        {/* Columna STOCK CENTRAL */}
                                        <TableCell
                                            className={`w-32 text-center py-3 transition-colors ${
                                                isEditable
                                                    ? "cursor-pointer dark:hover:bg-gray-800 hover:bg-gray-50"
                                                    : ""
                                            }`}
                                            onClick={() => {
                                                if (!isEditable) return
                                                setEditingField({ sku: variation.sku, field: "stockQuantity" })
                                                setEditValue(String(stockQuantity))
                                            }}
                                        >
                                            {editingField?.sku === variation.sku &&
                                            editingField?.field === "stockQuantity" ? (
                                                <div
                                                    className="flex justify-center"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Input
                                                        type="number"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={() => handleSaveEdit(product, variation.variationID)}
                                                        onWheel={(e) => {
                                                            e.currentTarget.blur()
                                                        }}
                                                        className="w-20 h-8 px-2 py-1 text-center text-xs"
                                                        autoFocus
                                                    />
                                                </div>
                                            ) : (
                                                <Badge
                                                    variant={stockQuantity <= 9 ? "destructive" : "default"}
                                                    className="font-bold text-sm"
                                                >
                                                    {stockQuantity}
                                                </Badge>
                                            )}
                                        </TableCell>

                                        <TableCell
                                            className={`group relative w-32 text-center py-3 transition-colors cursor-pointer dark:hover:bg-gray-800 hover:bg-gray-50`}
                                        >
                                            <Tooltip>
                                                <TooltipTrigger className="bg-white px-2 py-1 rounded-full text-gray-800">
                                                    {stockAgregado}
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {storeFilter && storeFilter.length > 0 ? (
                                                        <div className="space-y-1 text-left">
                                                            {storeFilter.map((sp) => (
                                                                <p
                                                                    key={`${sp.storeProductID}-${sp.storeID}`}
                                                                    className="whitespace-nowrap"
                                                                >
                                                                    {sp.store?.name || sp.Store?.name}: {sp.stock || 0}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p>No hay stock en ninguna tienda</p>
                                                    )}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                        {user?.role === Role.Admin && isFirst && (
                                            <TableCell
                                                className="text-center py-2"
                                                rowSpan={product.variations?.length || 1}
                                            >
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDeleteProduct(product)
                                                            }}
                                                            className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Eliminar producto</TooltipContent>
                                                </Tooltip>
                                            </TableCell>
                                        )}
                                        {user?.role === Role.Admin && !isFirst && <TableCell />}
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
            {/* Modal de Pricing */}
            <PricingModalWrapper
                pricingVariation={pricingVariation}
                setPricingVariation={setPricingVariation}
                storeID={storeID}
            />
        </div>
    )
}

// ── Renderizar PricingModal fuera del loop de tablas ───────────────────────────
function PricingModalWrapper({
    pricingVariation,
    setPricingVariation,
    storeID,
}: {
    pricingVariation: PricingVariationState
    setPricingVariation: Dispatch<SetStateAction<PricingVariationState>>
    storeID: string | null
}) {
    if (!pricingVariation || !storeID) return null
    const { product, variation } = pricingVariation
    const storeProduct = variation.storeProducts?.find((sp) => sp.storeID === storeID)

    const handlePriceUpdated = ({ storeProduct: updatedStoreProduct }: IUpdatePriceResponse) => {
        const applyUpdatedStoreProduct = (storeProducts: IProductVariationRaw["storeProducts"] = []) =>
            storeProducts.map((sp) =>
                sp.storeProductID === updatedStoreProduct.storeProductID
                    ? {
                          ...sp,
                          stock: updatedStoreProduct.stock,
                          priceCost: updatedStoreProduct.priceCost,
                          priceList: updatedStoreProduct.priceList,
                          updatedAt: updatedStoreProduct.updatedAt,
                      }
                    : sp,
            )

        const { rawProducts, setRawProducts } = inventoryStore.getState()
        const inventoryProducts = rawProducts as IRawProduct[]

        setRawProducts(
            inventoryProducts.map((rawProduct: IRawProduct) =>
                rawProduct.productID === product.productID
                    ? {
                          ...rawProduct,
                          variations: rawProduct.variations.map((rawVariation: IProductVariationRaw) => {
                              if (rawVariation.variationID !== variation.variationID) return rawVariation

                              const storeProducts = applyUpdatedStoreProduct(rawVariation.storeProducts)
                              return {
                                  ...rawVariation,
                                  storeProducts,
                                  StoreProducts: storeProducts,
                              }
                          }),
                      }
                    : rawProduct,
            ),
        )

        setPricingVariation((current) => {
            if (!current || current.variation.variationID !== variation.variationID) return current

            const storeProducts = applyUpdatedStoreProduct(current.variation.storeProducts)
            return {
                ...current,
                variation: {
                    ...current.variation,
                    storeProducts,
                    StoreProducts: storeProducts,
                },
            }
        })
    }

    return (
        <PricingModal
            isOpen
            onClose={() => setPricingVariation(null)}
            product={product as unknown as IProduct}
            variation={variation as unknown as IProductVariation}
            storeProduct={storeProduct as unknown as IStoreProduct}
            storeID={storeID}
            onPriceUpdated={handlePriceUpdated}
        />
    )
}
