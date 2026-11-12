"use client"

import { uploadImageCDN } from "@/actions/upload/image"
import { MAX_PRODUCT_PHOTO_BYTES } from "@/utils/product-photo-file"

export async function uploadProductPhoto(photo: Blob, name = "foto-1080x1350.jpg"): Promise<string> {
    if (!photo.size || photo.size > MAX_PRODUCT_PHOTO_BYTES) {
        throw new Error("La imagen debe pesar entre 1 byte y 5 MB")
    }
    const data = new FormData()
    data.append("file", photo, name)
    let result
    try {
        result = await uploadImageCDN(data)
    } catch {
        // Transport/framework failures occur before the action can return its
        // safe result. Do not display Next's production exception to the user.
        throw new Error("No se pudo enviar la foto. Revisa tu conexión, recarga la página e inténtalo de nuevo.")
    }
    if (!result.ok) throw new Error(`${result.error}${result.reference ? ` (Referencia: ${result.reference})` : ""}`)
    return result.secure_url
}
