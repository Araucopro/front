"use client"
import { useEffect, useMemo, useState } from "react"
import { ScanInput } from "@/components/CreateSale/ScanInput"
import { CartTable } from "@/components/CreateSale/CartTable"
import { useSaleStore } from "@/stores/sale.store"
import { ISaleReceiver, ISaleRequest, PaymentType, SaleType } from "@/interfaces/sales/ISale"
import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { IProduct } from "@/interfaces/products/IProduct"
import { toPrice } from "@/utils/priceFormat"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { useTienda } from "@/stores/tienda.store"
import { createNewSale } from "@/actions/sales/postSale"
import { toast } from "sonner"
import { DiscountModal, DiscountStoreProductOption } from "@/components/Discounts/DiscountModal"
import { getPriceCheck } from "@/actions/pricing/getPriceCheck"
import { getChileYYYYMMDD } from "@/utils/chile-date"

const isSpecialStoreFilter = (value: string | null) => value === "all" || value === "propias" || value === "consignadas"
const saleTypes = new Set<SaleType>(["BOLETA", "FACTURA", "NOTA_VENTA"])
const getSaleTypeFromParam = (value: string | null): SaleType =>
    value && saleTypes.has(value as SaleType) ? (value as SaleType) : "NOTA_VENTA"

export const SaleForm = ({ initialProducts }: { initialProducts: IProduct[] }) => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { cartItems, paymentMethod, actions } = useSaleStore()
    const { setPaymentMethod, clearCart, updateCartItemPricing } = actions
    const { storeSelected } = useTienda()
    const [loading, setLoading] = useState(false)
    const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false)
    const [saleType, setSaleType] = useState<SaleType>(() => getSaleTypeFromParam(searchParams.get("saleType")))
    const [receiver, setReceiver] = useState<ISaleReceiver>({
        rut: "",
        name: "",
        email: "",
        address: "",
        city: "",
        giro: "",
    })

    const urlStoreID = searchParams.get("storeID")
    const effectiveStoreID =
        storeSelected?.storeID ?? (urlStoreID && !isSpecialStoreFilter(urlStoreID) ? urlStoreID : "")
    const total = useMemo(() => {
        return cartItems.reduce((acc, item) => {
            const price = item.finalPrice ?? item.priceList
            return acc + item.quantity * price
        }, 0)
    }, [cartItems])

    const discountableStoreProducts = useMemo<DiscountStoreProductOption[]>(() => {
        const seen = new Set<string>()
        return cartItems
            .filter((item) => Boolean(item.storeProductID))
            .filter((item) => {
                if (seen.has(item.storeProductID)) return false
                seen.add(item.storeProductID)
                return true
            })
            .map((item) => ({
                storeProductID: item.storeProductID,
                productName: item.productName,
                variationName: item.sizeNumber,
                storeName: item.storeName ?? item.storeID,
                storeID: item.storeID,
                priceList: item.priceList,
            }))
    }, [cartItems])

    const hasDiscountableProducts = discountableStoreProducts.length > 0
    const handleDiscountCreated = async (storeProductID: string) => {
        try {
            const priceCheck = await getPriceCheck(storeProductID)
            updateCartItemPricing(storeProductID, {
                finalPrice: priceCheck.finalPrice,
                activeOffer: priceCheck.activeOffer ?? undefined,
            })
        } catch (error) {
            console.error("SaleForm: error refreshing pricing", error)
            toast.error("No se pudo actualizar el precio del producto")
        }
    }

    const handleSubmit = async () => {
        try {
            const hasEmptyProducts = cartItems.filter((item) => item.quantity === 0)
            if (hasEmptyProducts.length > 0) {
                return toast.error("Por favor elimina los productos sin stock")
            }
            if (!effectiveStoreID) return toast.error("No hay una tienda elegida")
            if (saleType === "FACTURA" && (!receiver.rut.trim() || !receiver.name.trim())) {
                return toast.error("Para emitir una factura indica al menos el RUT y la razón social")
            }

            const storeIDsInCart = new Set(cartItems.map((item) => item.storeID).filter(Boolean))
            if (storeIDsInCart.size > 1) {
                return toast.error("El carrito contiene productos de distintas tiendas.")
            }
            if (storeIDsInCart.size === 1 && !storeIDsInCart.has(effectiveStoreID)) {
                return toast.error("La tienda seleccionada no coincide con los productos del carrito.")
            }

            setLoading(true)
            const currentIssueDate = getChileYYYYMMDD(new Date())
            const shouldSendReceiver =
                saleType === "FACTURA" ||
                (saleType === "NOTA_VENTA" && Boolean(receiver.rut.trim() && receiver.name.trim()))
            const toSubmitSale: ISaleRequest = {
                saleType,
                paymentType: paymentMethod,
                issueDate: currentIssueDate,
                ...(shouldSendReceiver
                    ? {
                          receiver: {
                              rut: receiver.rut.trim(),
                              name: receiver.name.trim(),
                              email: receiver.email?.trim() || undefined,
                              address: receiver.address.trim(),
                              city: receiver.city.trim(),
                              giro: receiver.giro.trim(),
                          },
                      }
                    : {}),
                items: cartItems.map((item) => ({
                    storeProductID: item.storeProductID,
                    quantity: item.quantity,
                })),
            }

            const res = await createNewSale(effectiveStoreID, toSubmitSale)
            if (res) {
                const createdSaleID = res.sale.saleID || res.dte?.saleID || ""
                toast.success(res.dte ? "Documento emitido exitosamente" : "Nota de venta creada exitosamente")
                actions.clearCart()
                router.refresh()
                router.push(
                    createdSaleID
                        ? `/home/${createdSaleID}?storeID=${effectiveStoreID}`
                        : `/home?storeID=${effectiveStoreID}`,
                )
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Falló al crear la venta :("
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        return () => {
            clearCart()
        }
    }, [clearCart])

    useEffect(() => {
        setSaleType(getSaleTypeFromParam(searchParams.get("saleType")))
    }, [searchParams])

    return (
        <>
            <div className="p-4">
                <ScanInput initialProducts={initialProducts} />

                <CartTable />
                <div className="mt-4 flex flex-col gap-6">
                <div className="grid gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700 sm:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Documento</label>
                        <Select value={saleType} onValueChange={(value: SaleType) => setSaleType(value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NOTA_VENTA">Nota de venta</SelectItem>
                                <SelectItem value="BOLETA">Boleta electrónica</SelectItem>
                                <SelectItem value="FACTURA">Factura electrónica</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Tipo de pago</label>
                        <Select value={paymentMethod} onValueChange={(value: PaymentType) => setPaymentMethod(value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar tipo de pago" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Efectivo">Efectivo</SelectItem>
                                <SelectItem value="Debito">Débito</SelectItem>
                                <SelectItem value="Credito">Crédito</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {saleType !== "BOLETA" && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                        <div className="mb-3">
                            <h3 className="font-semibold text-gray-800 dark:text-slate-100">Datos del receptor</h3>
                            {saleType === "NOTA_VENTA" && (
                                <p className="text-xs text-gray-600 dark:text-slate-400">
                                    Opcional. Complétalos si esta nota podría convertirse después en factura.
                                </p>
                            )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <Input
                                value={receiver.rut}
                                onChange={(event) => setReceiver((current) => ({ ...current, rut: event.target.value }))}
                                placeholder="RUT"
                            />
                            <Input
                                value={receiver.name}
                                onChange={(event) => setReceiver((current) => ({ ...current, name: event.target.value }))}
                                placeholder="Razón social"
                            />
                            <Input
                                type="email"
                                value={receiver.email}
                                onChange={(event) => setReceiver((current) => ({ ...current, email: event.target.value }))}
                                placeholder="Correo (opcional)"
                            />
                            <Input
                                value={receiver.giro}
                                onChange={(event) => setReceiver((current) => ({ ...current, giro: event.target.value }))}
                                placeholder="Giro"
                            />
                            <Input
                                value={receiver.address}
                                onChange={(event) => setReceiver((current) => ({ ...current, address: event.target.value }))}
                                placeholder="Dirección"
                            />
                            <Input
                                value={receiver.city}
                                onChange={(event) => setReceiver((current) => ({ ...current, city: event.target.value }))}
                                placeholder="Comuna o ciudad"
                            />
                        </div>
                    </div>
                )}

                <div className="flex flex-col items-end justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <p className="text-xl font-semibold text-gray-800 dark:text-white">
                            Total estimado: ${toPrice(total)}
                        </p>
                    </div>
                    <Button
                        disabled={loading || cartItems.length === 0}
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition"
                    >
                        {loading ? "Procesando..." : saleType === "NOTA_VENTA" ? "Crear nota" : "Emitir documento"}
                    </Button>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsDiscountModalOpen(true)}
                            disabled={!hasDiscountableProducts}
                        >
                            Crear descuento
                        </Button>
                        {!hasDiscountableProducts && (
                            <p className="text-xs text-gray-500">
                                Agrega un producto con stock asignado para habilitar descuentos.
                            </p>
                        )}
                    </div>
                </div>
                </div>
            </div>
            <DiscountModal
                isOpen={isDiscountModalOpen}
                onClose={() => setIsDiscountModalOpen(false)}
                options={discountableStoreProducts}
                initialStoreProductID={discountableStoreProducts[0]?.storeProductID}
                onOfferCreated={(storeProductID) => handleDiscountCreated(storeProductID)}
            />
        </>
    )
}
