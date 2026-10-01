import type { DteDocumentValue, IDtePdfDocument } from "@/interfaces/dte/IDteDocument"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"

const PDF_KEYS = ["PDF", "pdf", "data", "content", "base64", "file", "document"] as const

const getStringValue = (value: unknown, depth = 0): string | null => {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (!value || typeof value !== "object" || Array.isArray(value) || depth > 4) return null

    const record = value as Record<string, unknown>
    for (const key of PDF_KEYS) {
        const candidate = getStringValue(record[key], depth + 1)
        if (candidate) return candidate
    }

    return null
}

export async function getDteDocument(
    dteDocumentID: string,
    storeID: string,
    value: DteDocumentValue = "json",
): Promise<unknown> {
    if (!dteDocumentID || !storeID) throw new Error("Faltan los datos necesarios para consultar el DTE.")

    const params = new URLSearchParams({ value })
    return fetcher<unknown>(
        `${API_URL}/v2/dte/document/${encodeURIComponent(dteDocumentID)}?${params.toString()}`,
        { headers: { "X-Store-ID": storeID } },
    )
}

export async function getDteDocumentPdf(dteDocumentID: string, storeID: string): Promise<IDtePdfDocument> {
    const response = await getDteDocument(dteDocumentID, storeID, "pdf")
    const content = getStringValue(response)

    if (!content) throw new Error("El facturador no devolvió el PDF del documento.")
    if (/^https?:\/\//i.test(content)) return { content, encoding: "url" }

    const base64 = content.replace(/^data:application\/pdf;base64,/i, "").replace(/\s/g, "")
    if (!base64) throw new Error("El PDF del documento está vacío.")
    return { content: base64, encoding: "base64" }
}
