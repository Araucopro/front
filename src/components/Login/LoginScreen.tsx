"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"
import LoginForm from "@/components/Login/LoginForm"
import useDarkMode from "@/hooks/useDarkMode"

export default function LoginScreen() {
    const { isDarkMode, setIsDarkMode } = useDarkMode()

    const handleThemeToggle = () => {
        if (isDarkMode === null) return

        const nextTheme = !isDarkMode
        const applyTheme = () => {
            document.documentElement.classList.toggle("dark", nextTheme)
            document.body?.classList.toggle("dark", nextTheme)
            flushSync(() => setIsDarkMode(nextTheme))
        }
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

        if (prefersReducedMotion || typeof document.startViewTransition !== "function") {
            applyTheme()
            return
        }

        document.documentElement.classList.add("theme-view-transition")
        const transition = document.startViewTransition(applyTheme)
        transition.ready
            .then(() => {
                document.documentElement.classList.remove("theme-view-transition")
                document.documentElement.animate(
                    { clipPath: ["inset(0 0 100% 0)", "inset(0)"] },
                    {
                        pseudoElement: "::view-transition-new(root)",
                        duration: 600,
                        easing: "ease-out",
                    },
                )
            })
            .catch(() => {
                document.documentElement.classList.remove("theme-view-transition")
            })
    }

    return (
        <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-[#eaf1ec] px-4 py-8 transition-colors dark:bg-[#071512]">
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(112deg,#f5f8f6_0%,#e7f0ea_48%,#dcebdd_100%)] transition-colors dark:bg-[linear-gradient(112deg,#081824_0%,#0b2325_48%,#0d2d20_100%)]"
            />

            <aside
                aria-label="Tecnología respaldada por D3SI y Avocco"
                className="pointer-events-none absolute bottom-5 right-5 z-[1] select-none text-right sm:bottom-7 sm:right-7 lg:bottom-9 lg:right-10"
            >
                <p className="mb-1.5 text-[8px] font-semibold uppercase tracking-[0.22em] text-[#174531]/45 dark:text-white/35">
                    Tecnología respaldada por
                </p>
                <Image
                    src="/brand/two-brands-colorv2.png"
                    alt=""
                    width={266}
                    height={38}
                    sizes="(max-width: 640px) 160px, (max-width: 1024px) 192px, 224px"
                    className="ml-auto h-auto w-40 opacity-45 dark:hidden sm:w-48 lg:w-56"
                />
                <Image
                    src="/brand/two-brandsv2.png"
                    alt=""
                    width={266}
                    height={38}
                    sizes="(max-width: 640px) 160px, (max-width: 1024px) 192px, 224px"
                    className="ml-auto hidden h-auto w-40 opacity-40 dark:block sm:w-48 lg:w-56"
                />
            </aside>

            <button
                type="button"
                onClick={handleThemeToggle}
                disabled={isDarkMode === null}
                aria-label={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                aria-pressed={isDarkMode === true}
                title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                className="absolute right-5 top-5 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/85 text-[#174531] shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#174531] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:border-white/15 dark:bg-slate-900/75 dark:text-lime-200 dark:hover:bg-slate-800 dark:focus-visible:ring-lime-300 dark:focus-visible:ring-offset-slate-950"
            >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="relative z-10 w-full max-w-[420px] rounded-[20px] border border-white/70 bg-[#fbfbfb]/95 px-7 py-10 shadow-[0_24px_70px_rgba(22,69,49,0.18)] backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-[#101f20]/95 dark:shadow-[0_24px_70px_rgba(0,0,0,0.42)] sm:px-11 sm:py-11"
            >
                <div className="relative mx-auto mb-5 h-32 w-32" aria-label="AraucoPro Software Retail">
                    <Image
                        src="/brand/araucoPro.png"
                        alt="AraucoPro Software Retail"
                        fill
                        priority
                        sizes="128px"
                        className="object-contain dark:hidden"
                    />
                    <Image
                        src="/brand/araucoProDark.png"
                        alt="AraucoPro Software Retail"
                        fill
                        priority
                        sizes="128px"
                        className="hidden object-contain dark:block"
                    />
                </div>

                <h1 className="text-center text-xl font-bold tracking-[-0.02em] text-[#171717] dark:text-slate-100">
                    Bienvenido
                </h1>
                <p className="mt-2 text-center text-[13px] font-normal tracking-[0.015em] text-[#697080] dark:text-slate-400">
                    Ingresa tus credenciales para continuar
                </p>

                <div className="mt-7">
                    <LoginForm />
                </div>
            </motion.div>
        </main>
    )
}
