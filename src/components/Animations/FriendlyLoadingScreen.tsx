import Image from "next/image"
import { Sparkles } from "lucide-react"

type FriendlyLoadingScreenProps = {
    title?: string
    detail?: string
    overlay?: boolean
}

const messages = [
    "Estamos personalizando tu experiencia...",
    "Preparando la caja y el inventario...",
    "Organizando tus ventas del día...",
]

export default function FriendlyLoadingScreen({
    title = "Preparando tu espacio de trabajo",
    detail = "Esto puede tomar unos segundos.",
    overlay = false,
}: FriendlyLoadingScreenProps) {
    return (
        <div
            className={`${
                overlay ? "fixed inset-0 z-50" : "min-h-[70vh] w-full"
            } relative isolate flex items-center justify-center overflow-hidden bg-slate-50 px-5 py-10 dark:bg-slate-950`}
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.14),transparent_34%),radial-gradient(circle_at_80%_75%,rgba(16,185,129,0.14),transparent_32%)]"
            />
            <div
                aria-hidden="true"
                className="absolute inset-0 opacity-35 bg-[linear-gradient(rgba(15,65,104,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,65,104,0.08)_1px,transparent_1px)] bg-[length:44px_44px] dark:opacity-15"
            />

            <div className="relative w-full max-w-md rounded-3xl border border-white/80 bg-white/90 p-8 text-center shadow-[0_24px_70px_rgba(15,35,60,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90">
                <Image
                    src="/brand/araucoPro.png"
                    alt="AraucoPro Software Retail"
                    width={180}
                    height={120}
                    priority
                    className="mx-auto h-24 w-44 object-contain dark:hidden"
                />
                <Image
                    src="/brand/araucoProDark.png"
                    alt="AraucoPro Software Retail"
                    width={180}
                    height={120}
                    priority
                    className="mx-auto hidden h-24 w-44 object-contain dark:block"
                />

                <div className="relative mx-auto mt-3 flex h-16 w-16 items-center justify-center">
                    <span className="absolute inset-0 rounded-full border-2 border-sky-100 dark:border-sky-950" />
                    <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-r-emerald-500 border-t-sky-600 motion-reduce:animate-none" />
                    <Sparkles className="h-6 w-6 animate-pulse text-sky-700 motion-reduce:animate-none dark:text-sky-300" />
                </div>

                <h1 className="mt-5 text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{detail}</p>

                <p className="sr-only">Estamos personalizando tu experiencia.</p>
                <div
                    aria-hidden="true"
                    className="friendly-loading-messages mt-6 h-6 text-sm font-medium text-sky-700 dark:text-sky-300"
                >
                    {messages.map((message, index) => (
                        <span key={message} style={{ animationDelay: `${index * 4}s` }}>
                            {message}
                        </span>
                    ))}
                </div>

                <div aria-hidden="true" className="mt-5 flex justify-center gap-2">
                    {[0, 1, 2].map((index) => (
                        <span
                            key={index}
                            className="h-2 w-2 animate-bounce rounded-full bg-sky-600 motion-reduce:animate-none dark:bg-sky-400"
                            style={{ animationDelay: `${index * 140}ms` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
