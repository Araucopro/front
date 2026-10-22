"use client"

import { useRef, useState } from "react"
import { uploadImageCDN } from "@/actions/upload/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SafeImage } from "@/components/ui/safe-image"
import { productImages, isValidProductImageList } from "@/utils/product-images"
import { toast } from "sonner"

export function ProductPhotoField({ value, onChange, onBusyChange, disabled = false }: {
    value: string; onChange: (value: string) => void; onBusyChange?: (busy: boolean) => void; disabled?: boolean
}) {
    const [busy, setBusy] = useState(false)
    const uploading = useRef(false)
    const photos = productImages(value)
    async function upload(files: FileList | null) {
        if (!files?.length || uploading.current) return
        const selected = Array.from(files)
        if (photos.length + selected.length > 5) { toast.error("Puedes guardar hasta 5 fotos por producto"); return }
        if (selected.some((file) => !/^image\/(jpeg|png|webp|avif|gif)$/.test(file.type) || file.size > 5 * 1024 * 1024)) {
            toast.error("Usa fotos JPG, PNG, WEBP, AVIF o GIF de hasta 5 MB"); return
        }
        uploading.current = true; setBusy(true); onBusyChange?.(true)
        const uploaded = [...photos]
        try {
            for (const file of selected) {
                const result = await uploadImageCDN(await file.arrayBuffer(), file.name)
                uploaded.push(result.secure_url)
                // Preserve successful uploads even if a later file fails.
                onChange(uploaded.join(", "))
            }
            toast.success("Fotos guardadas en Cloudinary")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudieron subir las fotos")
        } finally { uploading.current = false; setBusy(false); onBusyChange?.(false) }
    }
    return <div className="space-y-3">
        <Input aria-label="Enlaces de las fotos" value={value} disabled={disabled || busy}
            onChange={(event) => onChange(event.target.value)} placeholder="https://.../foto1.jpg, https://.../foto2.jpg" />
        <p className="text-xs text-slate-500">Hasta 5 enlaces separados por comas. La primera foto es la portada.</p>
        {!isValidProductImageList(value) && <p role="alert" className="text-xs text-red-600">Ingresa hasta 5 enlaces HTTP/HTTPS validos.</p>}
        <div className="flex flex-wrap gap-2">
            {photos.map((photo, index) => <div key={`${photo}-${index}`} className="space-y-1">
                <SafeImage src={photo} alt={`Foto ${index + 1}`} width={80} height={80} className="h-20 w-20 rounded object-cover" />
                <a href={photo} target="_blank" rel="noreferrer" className="block text-xs underline">Ver foto {index + 1}</a>
                <Button type="button" size="sm" variant="outline" disabled={disabled || busy}
                    onClick={() => onChange(photos.filter((_, current) => current !== index).join(", "))}>Quitar</Button>
            </div>)}
        </div>
        <label className="block text-sm">
            {busy ? "Subiendo fotos..." : "Subir fotos a Cloudinary"}
            <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                disabled={disabled || busy || photos.length >= 5} className="mt-2 block w-full text-xs"
                onChange={(event) => { void upload(event.target.files); event.target.value = "" }} />
        </label>
    </div>
}
