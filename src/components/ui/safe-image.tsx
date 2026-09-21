"use client"

import { useState } from "react"
import NextImage, { type ImageProps } from "next/image"

const FALLBACK_IMAGE = "/NoImage.jpg"

const exactRemoteHosts = new Set([
    "lsco.scene7.com",
    "example.com",
])

const remoteHostSuffixes = [
    ".cloudinary.com",
    ".d3si.cl",
    ".desi.cl",
    ".bing.com",
    ".bing.net",
    ".vtexassets.com",
    ".procircuit.cl",
    ".cloudfront.net",
    ".licdn.com",
    ".ejemplo.com",
]

export const getSafeImageSrc = (source?: ImageProps["src"] | null): ImageProps["src"] => {
    if (typeof source !== "string") return source ?? FALLBACK_IMAGE

    const value = source.trim()
    if (!value) return FALLBACK_IMAGE
    if (value.startsWith("/")) return value

    try {
        const url = new URL(value)
        const hostname = url.hostname.toLowerCase()
        const isAllowedHost = exactRemoteHosts.has(hostname) || remoteHostSuffixes.some((suffix) => hostname.endsWith(suffix))
        return url.protocol === "https:" && isAllowedHost ? value : FALLBACK_IMAGE
    } catch {
        return FALLBACK_IMAGE
    }
}

type SafeImageProps = Omit<ImageProps, "src"> & {
    src?: ImageProps["src"] | null
    fallbackSrc?: string
}

export function SafeImage({ src, fallbackSrc = FALLBACK_IMAGE, onError, ...props }: SafeImageProps) {
    const safeSrc = getSafeImageSrc(src)
    const [failedSrc, setFailedSrc] = useState<ImageProps["src"] | null>(null)
    const resolvedSrc = failedSrc === safeSrc ? fallbackSrc : safeSrc

    return (
        <NextImage
            {...props}
            src={resolvedSrc}
            onError={(event) => {
                setFailedSrc(safeSrc)
                onError?.(event)
            }}
        />
    )
}
