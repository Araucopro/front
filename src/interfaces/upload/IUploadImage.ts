export type UploadImageResult =
    | { ok: true; secure_url: string }
    | { ok: false; error: string; reference?: string }
