export const MAX_PRODUCT_IMAGES = 5
export const MAX_PRODUCT_IMAGE_LENGTH = 10000

export function productImages(value?: string | null): string[] {
    return [...new Set((value ?? "").split(",").map((url) => url.trim()).filter(Boolean))]
}

export function isValidProductImageList(value: string): boolean {
    if (value.length > MAX_PRODUCT_IMAGE_LENGTH) return false
    if (!value.trim()) return true
    const urls = value.split(",").map((url) => url.trim())
    return urls.length <= MAX_PRODUCT_IMAGES && urls.every((value) => {
        try {
            const url = new URL(value)
            return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
        } catch { return false }
    })
}

export const serializeProductImages = (value?: string | null): string => productImages(value).join(", ")
export const primaryProductImage = (value?: string | null): string => productImages(value)[0] ?? ""
