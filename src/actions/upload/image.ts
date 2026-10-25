"use server"

import { cloudinary } from "@/lib/cdn-setup"
import type { UploadApiResponse } from "cloudinary"
import { checkStatus } from "@/actions/auth/authActions"
import { cookies } from "next/headers"

export const uploadImageCDN = async (
    fileArrayBuffer: ArrayBuffer,
    _originalFileName?: string
): Promise<UploadApiResponse> => {
    if (!(await cookies()).get("auth_token")?.value) throw new Error("Inicia sesion para subir fotos")
    const { user } = await checkStatus()
    if (!user.tenantID) throw new Error("Selecciona una empresa antes de subir fotos")
    if (!(fileArrayBuffer instanceof ArrayBuffer) || !fileArrayBuffer.byteLength ||
        fileArrayBuffer.byteLength > 5 * 1024 * 1024) {
        throw new Error("La imagen debe pesar entre 1 byte y 5 MB")
    }
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({
            resource_type: "image",
            folder: `desi_v2/${user.tenantID}/products`,
            allowed_formats: ["jpg", "jpeg", "png", "webp", "avif", "gif"],
            unique_filename: true,
            overwrite: false,
        }, (error, result) => {
            if (error || !result) reject(new Error("No se pudo subir la foto a Cloudinary"))
            else resolve(result)
        }).end(Buffer.from(fileArrayBuffer))
    })
}
