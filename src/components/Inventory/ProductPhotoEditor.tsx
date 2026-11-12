"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DEFAULT_PRODUCT_PHOTO_OPTIONS, drawProductPhoto, loadProductPhoto, productPhotoBlob,
    type ProductPhotoOptions } from "@/utils/product-photo-format"
import { toast } from "sonner"

export function ProductPhotoEditor({ source, onApply, onClose }: {
    source: string; onApply: (photo: Blob) => Promise<void>; onClose: () => void
}) {
    const canvas = useRef<HTMLCanvasElement>(null)
    const [image, setImage] = useState<HTMLImageElement | null>(null)
    const [options, setOptions] = useState<ProductPhotoOptions>(DEFAULT_PRODUCT_PHOTO_OPTIONS)
    const [error, setError] = useState("")
    const [saving, setSaving] = useState(false)
    const applying = useRef(false)
    const id = useId()

    useEffect(() => {
        let active = true
        loadProductPhoto(source).then((loaded) => { if (active) setImage(loaded) })
            .catch((error: unknown) => { if (active) setError(error instanceof Error ? error.message : "No se pudo abrir la foto") })
        return () => { active = false }
    }, [source])

    useEffect(() => {
        if (!image || !canvas.current) return
        try { drawProductPhoto(canvas.current, image, options) }
        catch (error) { setError(error instanceof Error ? error.message : "No se pudo ajustar la foto") }
    }, [image, options])

    async function apply() {
        if (!canvas.current || !image || error || applying.current) return
        applying.current = true
        setSaving(true)
        try {
            await onApply(await productPhotoBlob(canvas.current))
            onClose()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar la foto ajustada")
        } finally { applying.current = false; setSaving(false) }
    }

    return <Dialog open onOpenChange={(open) => { if (!open && !applying.current) onClose() }}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl flex-col overflow-y-auto rounded-2xl bg-white p-5 dark:bg-slate-900 sm:p-6">
            <DialogHeader className="pr-6 text-left">
                <DialogTitle>Ajustar foto a 4:5</DialogTitle>
                <DialogDescription>Vista previa del JPG final de 1080 × 1350 px.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 sm:grid-cols-2">
                <div className="relative mx-auto aspect-[4/5] w-full max-w-60 overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <canvas ref={canvas} width={1080} height={1350} aria-label="Vista previa de la foto en formato 4:5" className="h-full w-full" />
                    {!image && !error && <div role="status" className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-50 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Cargando foto...</div>}
                </div>
                <div className="space-y-4">
                    <fieldset disabled={saving || !image || !!error} className="space-y-3">
                        <legend className="mb-2 text-sm font-medium">Cómo encajar la foto</legend>
                        {([
                            ["contain", "Foto completa", "Conserva toda la imagen y rellena con blanco."],
                            ["cover", "Rellenar y recortar", "Cubre todo el formato. Puedes mover el encuadre."],
                        ] as const).map(([fit, label, help]) => <label key={fit} className="flex cursor-pointer items-start gap-2 text-sm">
                            <input type="radio" name={`${id}-fit`} value={fit} checked={options.fit === fit}
                                onChange={() => setOptions({ ...DEFAULT_PRODUCT_PHOTO_OPTIONS, fit })} className="mt-1 accent-blue-600" />
                            <span>{label}<span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{help}</span></span>
                        </label>)}
                        {options.fit === "cover" && <div className="space-y-1">
                            <label htmlFor={`${id}-zoom`} className="flex justify-between text-xs font-medium"><span>Acercar</span><span>{Math.round(options.zoom * 100)}%</span></label>
                            <input id={`${id}-zoom`} type="range" min={1} max={4} step={0.05} value={options.zoom}
                                onChange={(event) => setOptions({ ...options, zoom: Number(event.target.value) })}
                                className="w-full accent-blue-600" />
                        </div>}
                        {options.fit === "cover" && ([
                            ["positionX", "Posición horizontal"], ["positionY", "Posición vertical"],
                        ] as const).map(([key, label]) => <div key={key} className="space-y-1">
                            <label htmlFor={`${id}-${key}`} className="text-xs font-medium">{label}</label>
                            <input id={`${id}-${key}`} type="range" min={0} max={100} value={options[key]}
                                onChange={(event) => setOptions({ ...options, [key]: Number(event.target.value) })}
                                className="w-full accent-blue-600" />
                        </div>)}
                    </fieldset>
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">La foto ajustada reemplazará esta imagen cuando guardes la ficha.</p>
                </div>
            </div>
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button>
                <Button type="button" disabled={!image || !!error || saving} onClick={() => void apply()}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {saving ? "Guardando foto..." : "Aplicar ajuste"}
                </Button>
            </div>
        </DialogContent>
    </Dialog>
}
