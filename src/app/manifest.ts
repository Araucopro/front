import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "ARAUCOPRO",
        short_name: "ARAUCOPRO",
        start_url: "/",
        scope: "/",
        description: "ARAUCOPRO - Sistema de gestión de ventas",
        theme_color: "#003c32",
        background_color: "#eaf1ec",
        orientation: "portrait",
        display: "standalone",
        dir: "auto",
        lang: "es",
        icons: [
            { purpose: "maskable", sizes: "1254x1254", src: "/brand/ARAUCOLOGO.jpeg", type: "image/jpeg" },
            { purpose: "any", sizes: "1254x1254", src: "/brand/ARAUCOLOGO.jpeg", type: "image/jpeg" },
        ],
    }
}
