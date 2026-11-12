import { useSaleStore } from "@/stores/sale.store"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SafeImage as Image } from "@/components/ui/safe-image"
import { Input } from "../ui/input"
import { toPrice } from "@/utils/priceFormat"
import { ShoppingCart, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { ICartPricingItem } from "@/interfaces/pricing/IPricing"

export const CartTable = ({ allowNegativeStock = false, pricingItems }: { allowNegativeStock?: boolean; pricingItems?: ICartPricingItem[] }) => {
    const { cartItems, actions } = useSaleStore()
    const { removeProduct, updateQuantity } = actions
    const pricingByID = new Map(pricingItems?.map((item) => [item.storeProductID, item]))
    const displayedItems = cartItems.map((item) => {
        const pricing = pricingByID.get(item.storeProductID)
        const offer = pricing?.discountsApplied.find((discount) => discount.source === "AUTO" && discount.applied)
        const finalPrice = pricing?.finalUnitPrice ?? (pricingItems ? undefined : item.finalPrice)
        return {
            ...item,
            priceList: pricing?.baseUnitPrice ?? item.priceList,
            finalPrice,
            lineTotal: pricing?.lineTotal ?? (finalPrice ?? item.priceList) * item.quantity,
            activeOffer: pricingItems ? offer : item.activeOffer,
        }
    })

    if (cartItems.length === 0) {
        return (
            <div className="flex min-h-[150px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-white text-center text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-400">
                <ShoppingCart className="mb-3 h-8 w-8 text-slate-400" />
                <p className="text-sm font-medium">El carrito está vacío</p>
                <p className="text-sm">Agrega productos para comenzar una venta.</p>
            </div>
        )
    }

    return (
        <div className="mb-6 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-left">Producto</TableHead>
                        <TableHead className="text-center">Cantidad</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-center">Acción</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {displayedItems.map((item) => (
                        <TableRow className="hover:bg-muted/50 dark:hover:bg-gray-700/50" key={item.storeProductID}>
                            <TableCell className="flex items-center gap-3 p-2">
                                <Image
                                    width={100}
                                    height={100}
                                    src={item.productImage}
                                    alt={item.productName}
                                    className="h-10 w-10 rounded object-cover"
                                />
                                <span>
                                    {item.productName} - {item.sizeNumber}
                                </span>
                            </TableCell>
                            <TableCell className="p-2 text-center">
                                <div>
                                    <Input
                                        title="Cantidad"
                                        type="number"
                                        min={0}
                                        max={allowNegativeStock ? undefined : item.stockQuantity}
                                        value={item.quantity}
                                        onWheel={(e) => {
                                            e.currentTarget.blur()
                                        }}
                                        onChange={(e) => {
                                            const nextQuantity = Number(e.target.value)
                                            if (!allowNegativeStock && item.stockQuantity === 0) {
                                                return toast.error("Stock agotado, solicite a central")
                                            }
                                            if (!allowNegativeStock && nextQuantity > item.stockQuantity) {
                                                return toast.error("La cantidad supera el stock disponible")
                                            }
                                            updateQuantity(item.storeProductID, Math.max(0, nextQuantity))
                                        }}
                                        className="w-16 rounded border border-gray-300 p-1 text-center"
                                    />

                                    <p
                                        className={`mt-1 text-xs ${
                                            allowNegativeStock && item.quantity > item.stockQuantity
                                                ? "font-medium text-amber-600"
                                                : "text-gray-500"
                                        }`}
                                    >
                                        Stock: {item.stockQuantity}
                                        {allowNegativeStock && item.quantity > item.stockQuantity
                                            ? ` · quedará en ${item.stockQuantity - item.quantity}`
                                            : ""}
                                    </p>
                                </div>
                            </TableCell>

                            <TableCell className="p-2 text-right">
                                {item.finalPrice !== undefined && item.finalPrice < item.priceList ? (
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-gray-400 line-through">
                                            ${toPrice(item.priceList)}
                                        </span>
                                        <span className="text-sm font-bold text-orange-600">
                                            ${toPrice(item.finalPrice)}
                                        </span>
                                        {item.activeOffer?.description && (
                                            <span className="text-[10px] italic text-orange-500">
                                                {item.activeOffer.description}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <span>${toPrice(item.priceList)}</span>
                                )}
                            </TableCell>
                            <TableCell className="p-2 text-right font-semibold">
                                ${toPrice(item.lineTotal)}
                            </TableCell>
                            <TableCell className="p-2 text-center">
                                <button
                                    title="Eliminar"
                                    onClick={() => removeProduct(item.storeProductID)}
                                    className="text-red-600 hover:text-red-800"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
