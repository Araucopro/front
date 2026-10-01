export type DteDocumentValue = "json" | "pdf" | "xml" | "status" | "cedible"

export interface IDtePdfDocument {
    content: string
    encoding: "base64" | "url"
}
