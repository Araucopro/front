export const PRODUCT_PHOTO_WIDTH = 1080
export const PRODUCT_PHOTO_HEIGHT = 1350

export type ProductPhotoFit = "contain" | "cover"
export type ProductPhotoOptions = { fit: ProductPhotoFit; positionX: number; positionY: number; zoom: number }

export const DEFAULT_PRODUCT_PHOTO_OPTIONS: ProductPhotoOptions = {
    fit: "contain", positionX: 50, positionY: 50, zoom: 1,
}

export function productPhotoPlacement(width: number, height: number, options = DEFAULT_PRODUCT_PHOTO_OPTIONS) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        throw new Error("La foto no tiene dimensiones válidas")
    }
    const ratio = options.fit === "cover" ? Math.max : Math.min
    const zoom = options.fit === "cover" ? Math.max(1, Math.min(4, options.zoom)) : 1
    const scale = ratio(PRODUCT_PHOTO_WIDTH / width, PRODUCT_PHOTO_HEIGHT / height) * zoom
    const drawnWidth = width * scale
    const drawnHeight = height * scale
    const clamp = (position: number) => Math.max(0, Math.min(100, position)) / 100
    return {
        x: (PRODUCT_PHOTO_WIDTH - drawnWidth) * clamp(options.positionX),
        y: (PRODUCT_PHOTO_HEIGHT - drawnHeight) * clamp(options.positionY),
        width: drawnWidth, height: drawnHeight,
    }
}

export function loadProductPhoto(source: File | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image()
        const localURL = typeof source === "string" ? null : URL.createObjectURL(source)
        const release = () => { if (localURL) URL.revokeObjectURL(localURL) }
        if (!localURL) image.crossOrigin = "anonymous"
        image.onload = () => { release(); resolve(image) }
        image.onerror = () => {
            release()
            reject(new Error(localURL
                ? "No se pudo abrir la foto. Prueba con JPG, PNG o WEBP."
                : "No se pudo abrir esta foto para ajustarla. Descárgala y vuelve a subirla desde tu computadora."))
        }
        image.src = localURL ?? (source as string)
    })
}

export function drawProductPhoto(canvas: HTMLCanvasElement, image: HTMLImageElement, options = DEFAULT_PRODUCT_PHOTO_OPTIONS) {
    canvas.width = PRODUCT_PHOTO_WIDTH
    canvas.height = PRODUCT_PHOTO_HEIGHT
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Tu navegador no permite ajustar fotos")
    const placement = productPhotoPlacement(image.naturalWidth, image.naturalHeight, options)
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = "high"
    context.drawImage(image, placement.x, placement.y, placement.width, placement.height)
}

export function productPhotoBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error("No se pudo generar la foto en formato 4:5"))
        }, "image/jpeg", 0.92)
    })
}

export async function formatProductPhoto(file: File): Promise<Blob> {
    const image = await loadProductPhoto(file)
    const canvas = document.createElement("canvas")
    drawProductPhoto(canvas, image)
    return productPhotoBlob(canvas)
}
