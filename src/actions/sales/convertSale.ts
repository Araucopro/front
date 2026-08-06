import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import type { ElectronicDocumentType, ISaleOperationResponse } from "@/interfaces/sales/ISale"
import { normalizeSaleOperation, type RawSaleOperation } from "@/lib/normalize-sale"

export const convertSale = async (
    saleID: string,
    storeID: string,
    documentType: ElectronicDocumentType,
): Promise<ISaleOperationResponse> => {
    const response = await fetcher<RawSaleOperation>(`${API_URL}/sales/${encodeURIComponent(saleID)}/convert`, {
        method: "POST",
        headers: { "X-Store-ID": storeID },
        body: JSON.stringify({ documentType }),
    })

    return normalizeSaleOperation(response, storeID)
}
