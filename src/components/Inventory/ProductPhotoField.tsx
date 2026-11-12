"use client"

import { useId, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Crop, ExternalLink, GripVertical, ImagePlus, Link2, Loader2, Star, Trash2, Upload } from "lucide-react"
import { uploadImageCDN } from "@/actions/upload/image"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SafeImage } from "@/components/ui/safe-image"
import { productImages, isValidProductImageList, moveProductImage } from "@/utils/product-images"
import { formatProductPhoto } from "@/utils/product-photo-format"
import { ProductPhotoEditor } from "./ProductPhotoEditor"
import { toast } from "sonner"

export function ProductPhotoField({ value, onChange, onBusyChange, disabled = false }: {
    value: string; onChange: (value: string) => void; onBusyChange?: (busy: boolean) => void; disabled?: boolean
}) {
    const [busy, setBusy] = useState(false)
    const [editing, setEditing] = useState<number | null>(null)
    const [announcement, setAnnouncement] = useState("")
    const draggedPhoto = useRef<number | null>(null)
    const uploading = useRef(false)
    const fileInput = useRef<HTMLInputElement>(null)
    const inputID = useId()
    const photos = productImages(value)
    const remaining = Math.max(0, 5 - photos.length)
    const invalid = !isValidProductImageList(value)
    const locked = disabled || busy || editing !== null

    function move(from: number, to: number) {
        if (locked || invalid || from === to) return
        onChange(moveProductImage(value, from, to))
        setAnnouncement(`Foto ${from + 1} movida a la posición ${to + 1}.${to === 0 ? " Ahora es la portada." : ""}`)
    }

    function closeEditor() {
        setEditing(null)
        onBusyChange?.(false)
    }

    async function applyPhoto(photo: Blob) {
        if (editing === null) return
        const result = await uploadImageCDN(await photo.arrayBuffer(), "foto-1080x1350.jpg")
        onChange(photos.map((current, index) => index === editing ? result.secure_url : current).join(", "))
        toast.success("Foto ajustada a 1080 × 1350 px. Guarda la ficha para aplicar el cambio.")
    }

    async function upload(files: FileList | null) {
        if (!files?.length || uploading.current || locked || invalid) return
        const selected = Array.from(files)
        if (photos.length + selected.length > 5) { toast.error("Puedes guardar hasta 5 fotos por producto"); return }
        if (selected.some((file) => !/^image\/(jpeg|png|webp|avif|gif)$/.test(file.type) || file.size > 5 * 1024 * 1024)) {
            toast.error("Usa fotos JPG, PNG, WEBP, AVIF o GIF de hasta 5 MB"); return
        }
        uploading.current = true; setBusy(true); onBusyChange?.(true)
        const uploaded = [...photos]
        try {
            for (const file of selected) {
                const formatted = await formatProductPhoto(file)
                const result = await uploadImageCDN(await formatted.arrayBuffer(), "foto-1080x1350.jpg")
                uploaded.push(result.secure_url)
                // Preserve successful uploads even if a later file fails.
                onChange(uploaded.join(", "))
            }
            toast.success("Fotos subidas en formato 1080 × 1350 px")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudieron subir las fotos")
        } finally { uploading.current = false; setBusy(false); onBusyChange?.(false) }
    }

    return <section className="space-y-4" aria-label="Fotos del producto">
        <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Galería de fotos</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">La primera foto es la portada.</p>
                {photos.length > 1 && <p className="text-xs text-slate-500 dark:text-slate-400">Arrastra las fotos o usa las flechas para cambiar el orden.</p>}
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300" aria-live="polite">{photos.length} de 5</span>
        </div>

        {photos.length ? <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-5">
            {photos.map((photo, index) => <div key={photo}
                onDragOver={(event) => { if (!locked && draggedPhoto.current !== null) event.preventDefault() }}
                onDrop={(event) => {
                    if (locked || draggedPhoto.current === null) return
                    event.preventDefault()
                    move(draggedPhoto.current, index)
                    draggedPhoto.current = null
                }}
                className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
                <div className="relative aspect-[4/5] bg-white">
                    <SafeImage src={photo} alt={`Foto ${index + 1}`} fill sizes="(max-width: 640px) 40vw, 140px" className="object-contain p-2" />
                    <button type="button" draggable={!locked && !invalid} disabled={locked || invalid} aria-label={`Arrastrar foto ${index + 1} para ordenar`}
                        title="Arrastra para cambiar el orden"
                        onDragStart={(event) => { draggedPhoto.current = index; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", photo) }}
                        onDragEnd={() => { draggedPhoto.current = null }}
                        className="absolute left-1.5 top-1.5 flex h-7 w-7 cursor-grab items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-sm active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50">
                        <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    {index === 0 && <span className="absolute bottom-2 left-2 rounded-md bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white shadow-sm">Portada</span>}
                    <button type="button" disabled={locked} aria-label={`Quitar foto ${index + 1}`}
                        title={`Quitar foto ${index + 1}`} onClick={() => onChange(photos.filter((_, current) => current !== index).join(", "))}
                        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                </div>
                <a href={photo} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-1 px-2.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400">
                    <span>Foto {index + 1}</span><ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
                <div className="space-y-1 border-t border-slate-100 p-1.5 dark:border-slate-800">
                    <Button type="button" variant="ghost" disabled={locked || invalid} className="h-8 w-full gap-1 px-1 text-xs"
                        aria-label={`Ajustar foto ${index + 1} a formato 4:5`}
                        onClick={() => { setEditing(index); onBusyChange?.(true) }}>
                        <Crop className="h-3.5 w-3.5" aria-hidden="true" /> Ajustar 4:5
                    </Button>
                    <div className="flex items-center justify-between gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={locked || invalid || index === 0}
                            aria-label={`Mover foto ${index + 1} antes`} title="Mover antes" onClick={() => move(index, index - 1)}>
                            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={locked || invalid || index === 0}
                            aria-label={`Usar foto ${index + 1} como portada`} title="Usar como portada" onClick={() => move(index, 0)}>
                            <Star className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={locked || invalid || index === photos.length - 1}
                            aria-label={`Mover foto ${index + 1} después`} title="Mover después" onClick={() => move(index, index + 1)}>
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                    </div>
                </div>
            </div>)}
        </div> : <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center dark:border-slate-700 dark:bg-slate-950">
            <ImagePlus className="h-7 w-7 text-slate-400" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Agrega la primera foto de tu producto</p>
            <p className="text-xs text-slate-500">Puedes subir archivos o pegar sus enlaces.</p>
        </div>}
        <p role="status" className="sr-only">{announcement}</p>

        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{remaining === 0 ? "Galería completa" : "Sube fotos desde tu computadora"}</p>
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{remaining === 0 ? "Quita una foto para agregar otra." : "JPG, PNG, WEBP, AVIF o GIF. Hasta 5 MB por foto."}</p>
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">Se convierten a JPG de 1080 × 1350 px (4:5), con la foto completa y fondo blanco. Los GIF se guardan como imagen fija.</p>
                </div>
                <Button type="button" variant="outline" disabled={locked || invalid || !remaining}
                    onClick={() => fileInput.current?.click()} className="h-9 rounded-lg border-blue-200 bg-white text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                    {busy ? "Subiendo..." : "Seleccionar fotos"}
                </Button>
            </div>
            <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                aria-label="Seleccionar archivos de fotos" disabled={locked || invalid || !remaining} className="hidden"
                onChange={(event) => { void upload(event.target.files); event.target.value = "" }} />
        </div>

        <details className="group rounded-xl border border-slate-200 dark:border-slate-700">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden">
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Agregar o editar enlaces de fotos
            </summary>
            <div className="space-y-2 border-t border-slate-100 p-4 dark:border-slate-800">
                <label htmlFor={inputID} className="text-xs font-medium text-slate-700 dark:text-slate-300">Enlaces de las fotos</label>
                <Textarea id={inputID} rows={3} value={value} disabled={locked} aria-invalid={invalid}
                    aria-describedby={`${inputID}-help`} className="resize-y break-all rounded-lg border-slate-200 bg-white text-xs leading-relaxed dark:border-slate-700 dark:bg-slate-950"
                    onChange={(event) => onChange(event.target.value)} placeholder="https://.../foto1.jpg, https://.../foto2.jpg" />
                <p id={`${inputID}-help`} className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">Separa los enlaces por comas. Se guardarán en la columna Imagen del Excel.</p>
            </div>
        </details>
        {invalid && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">Ingresa hasta 5 enlaces HTTP/HTTPS válidos.</p>}
        {editing !== null && <ProductPhotoEditor source={photos[editing]} onApply={applyPhoto} onClose={closeEditor} />}
    </section>
}
