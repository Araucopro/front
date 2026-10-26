"use server"

import { cloudinary } from "@/lib/cdn-setup"
import type { UploadApiResponse } from "cloudinary"
import { getAllStores } from "@/actions/stores/getAllStores"
import { cookies } from "next/headers"

export const uploadImageCDN = async (
    fileArrayBuffer: ArrayBuffer,
    _originalFileName?: string
): Promise<UploadApiResponse> => {
    if (!(await cookies()).get("auth_token")?.value) throw new Error("Inicia sesion para subir fotos")
    if (!(fileArrayBuffer instanceof ArrayBuffer) || !fileArrayBuffer.byteLength ||
        fileArrayBuffer.byteLength > 5 * 1024 * 1024) {
        throw new Error("La imagen debe pesar entre 1 byte y 5 MB")
    }
    // /auth/check-status omits tenantID and expects a tenant user, not a Master.
    // Use the stores returned for the current Bearer session, validated by the ERP.
    // Never accept a tenant ID from the browser or decode an unverified cookie.
    const stores = await getAllStores()
    const tenantID = stores[0]?.tenantID
    if (!tenantID || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantID) ||
        stores.some(store => store.tenantID !== tenantID)) {
        throw new Error("No se pudo verificar la empresa activa para subir fotos. Vuelve a ingresar a la empresa.")
    }
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({
            resource_type: "image",
            folder: `desi_v2/${tenantID}/products`,
            allowed_formats: ["jpg", "jpeg", "png", "webp", "avif", "gif"],
            unique_filename: true,
            overwrite: false,
        }, (error, result) => {
            if (error || !result) reject(new Error("No se pudo subir la foto a Cloudinary"))
            else resolve(result)
        }).end(Buffer.from(fileArrayBuffer))
    })
}
