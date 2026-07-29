"use client"

import { motion } from "framer-motion"
import LoginForm from "@/components/Login/LoginForm"

export default function LoginScreen() {
    return (
        <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-[#102a2b] px-4 py-8">
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(112deg,#102334_0%,#102b30_48%,#10382a_100%)]"
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="relative z-10 w-full max-w-[420px] rounded-[20px] bg-[#fbfbfb] px-7 py-10 shadow-[0_24px_70px_rgba(0,0,0,0.18)] sm:px-11 sm:py-11"
            >
                <div aria-hidden="true" className="h-[58px]" />

                <h1 className="text-center text-xl font-bold tracking-[-0.02em] text-[#171717]">Bienvenido</h1>
                <p className="mt-2 text-center text-[13px] font-normal tracking-[0.015em] text-[#697080]">
                    Ingresa tus credenciales para continuar
                </p>

                <div className="mt-7">
                    <LoginForm />
                </div>
            </motion.div>
        </main>
    )
}
