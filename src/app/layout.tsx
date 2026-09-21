import type { Metadata } from "next"
import { Toaster } from "sonner"
import "../styles/globals.css"

export const metadata: Metadata = {
    title: "ARAUCOPRO",
    description: "ARAUCOPRO - Sistema de gestión de inventario, ventas y usuarios",
    icons: {
        icon: [{ url: "/brand/ARAUCOLOGO.jpeg", type: "image/jpeg" }],
        apple: [{ url: "/brand/ARAUCOLOGO.jpeg", type: "image/jpeg" }],
    },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es-ES" suppressHydrationWarning>
            <head />
            <body className="font-sans antialiased">
                {children}
                <Toaster />
            </body>
        </html>
    )
}
