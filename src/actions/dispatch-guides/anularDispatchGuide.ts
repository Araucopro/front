import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import type { IDispatchGuideOperationResponse } from "@/interfaces/dispatch-guides/IDispatchGuide"

export const anularDispatchGuide = async (
    dispatchGuideID: string,
    storeID?: string,
): Promise<IDispatchGuideOperationResponse> => {
    return fetcher<IDispatchGuideOperationResponse>(
        `${API_URL}/dispatch-guides/${encodeURIComponent(dispatchGuideID)}/anular`,
        {
            method: "POST",
            headers: storeID ? { "X-Store-ID": storeID } : undefined,
        },
    )
}
