"use client"

// Local browser fixture only. Never keep its generated route in src/app.
import { useState } from "react"
import { ProductPhotoField } from "@/components/Inventory/ProductPhotoField"
import { uploadProductPhoto } from "@/actions/upload/uploadProductPhoto"

export default function ProductPhotoUploadFixture() {
    const [photos, setPhotos] = useState("")
    const [busy, setBusy] = useState(false)
    const [rawResult, setRawResult] = useState("")
    return <main className="mx-auto max-w-3xl p-5">
        <ProductPhotoField value={photos} onChange={setPhotos} onBusyChange={setBusy} />
        <output data-testid="photo-value">{photos}</output>
        <output data-testid="photo-busy">{String(busy)}</output>
        <label>Original sin ajustar<input aria-label="Original sin ajustar" type="file" onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) return
            setRawResult("Enviando")
            try { setRawResult(await uploadProductPhoto(file, file.name)) }
            catch (error) { setRawResult(error instanceof Error ? error.message : "Error") }
        }} /></label>
        <output data-testid="raw-result">{rawResult}</output>
    </main>
}
