import { ISaleProduct, ISaleResponse } from "@/interfaces/sales/ISale"

export const getAnulatedProducts = (sale: ISaleResponse): ISaleProduct[] => {
    const completedReturns = (sale.Returns ?? []).filter(
        (ret) => ret.status === "COMPLETADA" && ret.returnType !== "DESCUENTO",
    )
    const modernReturnItems = completedReturns.flatMap((ret) =>
        ret.items.map((item) => ({
            saleItemID: item.saleItemID,
            saleProductID: item.saleItemID,
            variationID: item.variationID,
            storeProductID: item.storeProductID,
            returnedQuantity: item.quantity,
        })),
    )
    const returnItems = modernReturnItems.length > 0 ? modernReturnItems : (sale.Return?.ProductAnulations ?? [])
    if (returnItems.length === 0) return []

    const returnedQtyByKey = new Map<string, number>()

    for (const anul of returnItems) {
        const returnedQty = anul.returnedQuantity ?? 0
        const keys = ["saleItemID" in anul ? anul.saleItemID : undefined, anul.saleProductID, anul.variationID, anul.storeProductID].filter(
            (key): key is string => Boolean(key),
        )

        for (const key of keys) {
            returnedQtyByKey.set(key, (returnedQtyByKey.get(key) ?? 0) + returnedQty)
        }
    }

    return sale.SaleProducts.flatMap((saleProduct) => {
        const returnedQty =
            returnedQtyByKey.get(saleProduct.saleItemID) ??
            returnedQtyByKey.get(saleProduct.saleProductID) ??
            returnedQtyByKey.get(saleProduct.variationID) ??
            0

        if (returnedQty <= 0) return []

        return [{ ...saleProduct, quantitySold: returnedQty }]
    })
}
