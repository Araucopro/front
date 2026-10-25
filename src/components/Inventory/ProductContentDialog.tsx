"use client"

import { useState, type FormEvent } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (uploading || saving) return
        setSaving(true)
        try {
            const content = await updateProductContent(product.productID, { image, description, slug })
            const { rawProducts, setRawProducts } = inventoryStore.getState()
            setRawProducts((rawProducts as IRawProduct[]).map((current) =>
                current.productID === product.productID ? { ...current, ...content } : current))
            toast.success("Ficha guardada. La web mostrara el producto cuando tenga foto, descripcion y slug.")
            onClose()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar la ficha")
        } finally { setSaving(false) }
    }
    return <Dialog open onOpenChange={(open) => { if (!open && !uploading && !saving) onClose() }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader><DialogTitle>Fotos y ficha web</DialogTitle>
                <DialogDescription>{product.name}. La web requiere al menos una foto, descripcion y slug.</DialogDescription>
            </DialogHeader>
            <form onSubmit={save} className="space-y-5">
                <ProductPhotoField value={image} onChange={setImage} onBusyChange={setUploading} disabled={saving} />
                <label className="block space-y-2"><span>Descripcion del producto</span>
                    <textarea className="min-h-24 w-full rounded border p-2" value={description}
                        onChange={(event) => setDescription(event.target.value)} disabled={saving || uploading} />
                </label>
                <label className="block space-y-2"><span>Slug</span>
                    <Input required maxLength={255} value={slug} onChange={(event) => setSlug(event.target.value)} disabled={saving || uploading} />
                </label>
                <p className="text-xs text-slate-500">Los enlaces quedan guardados en el producto y se incluyen en la columna Imagen del Excel. Quitar una foto de la ficha conserva el archivo en Cloudinary.</p>
                <Button type="submit" disabled={saving || uploading || !isValidProductImageList(image)}>
                    {uploading ? "Subiendo fotos..." : saving ? "Guardando..." : "Guardar ficha"}
                </Button>
            </form>
        </DialogContent>
    </Dialog>
}
