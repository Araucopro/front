"use server"

import { cloudinary } from "@/lib/cdn-setup"
import type { UploadApiResponse } from "cloudinary"
import { getAllStores } from "@/actions/stores/getAllStores"
import { cookies } from "next/headers"
import { randomUUID } from "node:crypto"
import type { UploadImageResult } from "@/interfaces/upload/IUploadImage"
import { isSupportedProductPhoto } from "@/utils/product-photo-file"

export const uploadImageCDN = async (data: FormData): Promise<UploadImageResult> => {
    let stage = "session"
    try {
        if (!(await cookies()).get("auth_token")?.value) return { ok: false, error: "Inicia sesión para subir fotos" }
        const file = data instanceof FormData ? data.get("file") : null
        if (!(file instanceof File) || !isSupportedProductPhoto(file)) {
            return { ok: false, error: "Usa fotos JPG, PNG, WEBP, AVIF o GIF de entre 1 byte y 5 MB" }
        }
        // /auth/check-status omits tenantID and expects a tenant user, not a Master.
        // Use the stores returned for the current Bearer session, validated by the ERP.
        // Never accept a tenant ID from the browser or decode an unverified cookie.
        stage = "stores"
        const stores = await getAllStores()
        const tenantID = stores[0]?.tenantID
        if (!tenantID || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantID) ||
            stores.some(store => store.tenantID !== tenantID)) {
            return { ok: false, error: "No se pudo verificar la empresa activa para subir fotos. Vuelve a ingresar a la empresa." }
        }
        stage = "cloudinary"
        const buffer = Buffer.from(await file.arrayBuffer())
        const result = await new Promise<UploadApiResponse>((resolve, reject) => {
            cloudinary.uploader.upload_stream({
                resource_type: "image",
                folder: `desi_v2/${tenantID}/products`,
                allowed_formats: ["jpg", "jpeg", "png", "webp", "avif", "gif"],
                unique_filename: true,
                overwrite: false,
                timeout: 60000,
            }, (error, result) => {
                if (error || !result) reject(error ?? new Error("Missing upload result"))
                else resolve(result)
            }).end(buffer)
        })
        if (!result.secure_url?.startsWith("https://")) throw new Error("Missing secure image URL")
        return { ok: true, secure_url: result.secure_url }
    } catch (error: unknown) {
        const reference = randomUUID()
        const httpCode = error && typeof error === "object" && "http_code" in error ? error.http_code : undefined
        // Record enough to locate the failing stage, without tokens, image
        // contents, provider responses or credentials in logs/the browser.
        console.error("[product-photo-upload]", { reference, stage, httpCode: typeof httpCode === "number" ? httpCode : undefined })
        const message = stage === "stores"
            ? "No se pudo verificar tu acceso a la empresa. Vuelve a ingresar e intenta subir la foto."
            : stage === "cloudinary" && httpCode === 400
                ? "El servicio de fotos no pudo procesar la imagen. Prueba exportándola como JPG o PNG."
                : "El servicio de fotos no está disponible en este momento. Inténtalo de nuevo; si continúa, informa la referencia a soporte."
        return { ok: false, error: message, reference }
    }
}
