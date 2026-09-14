import type { NextConfig } from "next"

// Fix SSL certificate verification in development against Railway/self-signed certs
if (process.env.NODE_ENV !== "production") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
}

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "*.cloudinary.com",
            },
            {
                protocol: "https",
                hostname: "*.d3si.cl",
            },
            {
                protocol: "https",
                hostname: "*.desi.cl",
            },
            {
                protocol: "https",
                hostname: "*.bing.com",
            },
            {
                protocol: "https",
                hostname: "*.bing.net",
            },
            {
                protocol: "https",
                hostname: "*.vtexassets.com",
            },
            {
                protocol: "https",
                hostname: "*.procircuit.cl",
            },
            {
                protocol: "https",
                hostname: "lsco.scene7.com",
            },
            {
                protocol: "https",
                hostname: "*.cloudfront.net",
            },
            {
                protocol: "https",
                hostname: "example.com",
            },
            {
                protocol: "https",
                hostname: "*.licdn.com",
            },
            {
                protocol: "https",
                hostname: "*.ejemplo.com",
            },
        ],
    },
}

export default nextConfig
