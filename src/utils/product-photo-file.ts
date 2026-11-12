export const MAX_PRODUCT_PHOTO_BYTES = 5 * 1024 * 1024

// Some file pickers omit the MIME type or use JPEG aliases. The decoder and
// Cloudinary still validate the actual image; the extension is only a UX hint.
export function isSupportedProductPhoto(file: Pick<File, "name" | "type" | "size">): boolean {
    if (file.size <= 0 || file.size > MAX_PRODUCT_PHOTO_BYTES) return false
    const mime = file.type.toLowerCase()
    if (/^image\/(jpeg|jpg|pjpeg|png|webp|avif|gif)$/.test(mime)) return true
    return (!mime || mime === "application/octet-stream") && /\.(jpe?g|png|webp|avif|gif)$/i.test(file.name)
}
