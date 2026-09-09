import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import type {
    ICreateDispatchGuide,
    IDispatchGuideOperationResponse,
} from "@/interfaces/dispatch-guides/IDispatchGuide"

export const createDispatchGuide = async (
    storeID: string,
    payload: ICreateDispatchGuide,
    idempotencyKey = crypto.randomUUID(),
): Promise<IDispatchGuideOperationResponse> => {
    return fetcher<IDispatchGuideOperationResponse>(`${API_URL}/dispatch-guides`, {
        method: "POST",
        headers: {
            "X-Store-ID": storeID,
            "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
    })
}
