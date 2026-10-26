"use client"

import { useState, type FormEvent } from "react"
import { Images, Loader2, Save } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ProductPhotoField } from "./ProductPhotoField"
import { updateProductContent } from "@/actions/products/updateProductContent"
import { inventoryStore } from "@/stores/inventory.store"
import type { IRawProduct } from "@/interfaces/products/IRawProduct"
import { isValidProductImageList } from "@/utils/product-images"
import { toast } from "sonner"

export function ProductContentDialog({ product, onClose }: { product: IRawProduct; onClose: () => void }) {
    const [image, setImage] = useState(product.image ?? "")
    const [description, setDescription] = useState(product.description ?? "")
    const [slug, setSlug] = useState(product.slug ?? "")
    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)
    const busy = uploading || saving

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (busy) return
        setSaving(true)
        try {
            const content = await updateProductContent(product.productID, { image, description, slug })
            const { rawProducts, setRawProducts } = inventoryStore.getState()
            setRawProducts((rawProducts as IRawProduct[]).map((current) =>
                current.productID === product.productID ? { ...current, ...content } : current))
            toast.success("Ficha guardada")
            onClose()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar la ficha")
        } finally { setSaving(false) }
    }

    return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose() }}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[780px] flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 dark:border-slate-700 dark:bg-slate-900">
            <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-5 pr-14 text-left sm:pl-7 sm:pr-14 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                        <Images className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 space-y-1">
                        <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">Fotos y ficha web</DialogTitle>
                        <DialogDescription className="truncate text-sm text-slate-500 dark:text-slate-400" title={product.name}>{product.name}</DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <form onSubmit={save} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
                    <ProductPhotoField value={image} onChange={setImage} onBusyChange={setUploading} disabled={saving} />

                    <section className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800" aria-labelledby="product-web-content-heading">
                        <div className="space-y-1">
                            <h3 id="product-web-content-heading" className="text-sm font-semibold text-slate-900 dark:text-slate-100">Información del producto</h3>
                            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">Completa la descripción y el enlace para la ficha de tu tienda.</p>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="product-web-description" className="text-sm font-medium text-slate-700 dark:text-slate-300">Descripción del producto</label>
                            <Textarea id="product-web-description" rows={3} className="min-h-24 resize-y rounded-lg border-slate-200 bg-white text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-950"
                                placeholder="Describe las características del producto..." value={description}
                                onChange={(event) => setDescription(event.target.value)} disabled={busy} />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="product-web-slug" className="text-sm font-medium text-slate-700 dark:text-slate-300">Enlace del producto (slug)</label>
                            <Input id="product-web-slug" required maxLength={255} value={slug}
                                className="h-11 rounded-lg border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                                placeholder="nombre-del-producto" onChange={(event) => setSlug(event.target.value)} disabled={busy}
                                aria-describedby="product-web-slug-help" />
                            <p id="product-web-slug-help" className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">Se usa en la dirección de la ficha. Consérvalo al cambiar el nombre del producto.</p>
                        </div>
                    </section>
                </div>

                <div className="flex shrink-0 flex-col gap-4 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7 dark:border-slate-800 dark:bg-slate-950">
                    <p className="max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">Los cambios se aplican al guardar la ficha.</p>
                    <div className="flex items-center justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onClose} disabled={busy} className="h-10 flex-1 rounded-lg sm:flex-none">Cancelar</Button>
                        <Button type="submit" disabled={busy || !isValidProductImageList(image)} className="h-10 flex-1 rounded-lg bg-blue-600 px-5 text-white hover:bg-blue-700 sm:flex-none">
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                            {uploading ? "Subiendo fotos..." : saving ? "Guardando..." : "Guardar ficha"}
                        </Button>
                    </div>
                </div>
            </form>
        </DialogContent>
    </Dialog>
}
