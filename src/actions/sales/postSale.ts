import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import { ISaleOperationResponse, ISaleRequest } from "@/interfaces/sales/ISale"
import { normalizeSaleOperation, type RawSaleOperation } from "@/lib/normalize-sale"

/**
 * Registra una nueva venta en el sistema.
 * POST /sales
 */
export const createNewSale = async (
    storeID: string,
    saleData: ISaleRequest,
    idempotencyKey = crypto.randomUUID(),
): Promise<ISaleOperationResponse> => {
    const response = await fetcher<RawSaleOperation>(`${API_URL}/sales`, {
        method: "POST",
        headers: {
            "X-Store-ID": storeID,
            "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(saleData),
    })

    return normalizeSaleOperation(response, storeID)
}
