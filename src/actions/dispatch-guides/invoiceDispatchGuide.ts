import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import type {
    IDispatchGuideDte,
    IInvoiceDispatchGuides,
} from "@/interfaces/dispatch-guides/IDispatchGuide"

export const invoiceDispatchGuide = async (
    dispatchGuideID: string,
    storeID: string,
    payload: IInvoiceDispatchGuides,
    idempotencyKey = crypto.randomUUID(),
): Promise<IDispatchGuideDte> => {
    return fetcher<IDispatchGuideDte>(
        `${API_URL}/dispatch-guides/${encodeURIComponent(dispatchGuideID)}/invoice`,
        {
            method: "POST",
            headers: {
                "X-Store-ID": storeID,
                "Idempotency-Key": idempotencyKey,
            },
            body: JSON.stringify(payload),
        },
    )
}
