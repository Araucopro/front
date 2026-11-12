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

export function moveProductImage(value: string, from: number, to: number): string {
    const photos = productImages(value)
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 ||
        from >= photos.length || to >= photos.length || from === to) return value
    const [photo] = photos.splice(from, 1)
    photos.splice(to, 0, photo)
    return photos.join(", ")
}
