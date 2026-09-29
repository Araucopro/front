"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { changePassword } from "@/actions/auth/authActions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/stores/user.store"
import { KeyRound, LogOut, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

export function ChangePasswordForm() {
    const router = useRouter()
    const logoutLocally = useAuth((state) => state.logout)
    const [newPassword, setNewPassword] = useState("")
    const [confirmation, setConfirmation] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (newPassword.length < 6) {
            toast.error("La nueva contraseña debe tener al menos 6 caracteres.")
            return
        }
        if (newPassword !== confirmation) {
            toast.error("Las contraseñas no coinciden.")
            return
        }

        setIsSubmitting(true)
        try {
            const result = await changePassword(newPassword)
            if (!result.changed) throw new Error("El servidor no confirmó el cambio de contraseña.")

            logoutLocally()
            toast.success("Contraseña actualizada. Inicia sesión nuevamente.")
            router.replace("/login")
            router.refresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo cambiar la contraseña.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
            <div className="mb-6 flex items-start gap-3 border-b border-slate-200 pb-5 dark:border-slate-700">
                <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                    <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="font-semibold text-slate-900 dark:text-white">Cambiar contraseña</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                        Al guardar se cerrarán todas tus sesiones y tendrás que ingresar nuevamente.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="new-password">Nueva contraseña</Label>
                    <Input
                        id="new-password"
                        type="password"
                        autoComplete="new-password"
                        minLength={6}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
                    <Input
                        id="confirm-password"
                        type="password"
                        autoComplete="new-password"
                        minLength={6}
                        value={confirmation}
                        onChange={(event) => setConfirmation(event.target.value)}
                        placeholder="Repite la nueva contraseña"
                        required
                    />
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    <div className="flex gap-2">
                        <LogOut className="mt-0.5 h-4 w-4 shrink-0" />
                        El cambio invalida también las sesiones abiertas en otros dispositivos.
                    </div>
                </div>

                <Button type="submit" disabled={isSubmitting || !newPassword || !confirmation}>
                    <KeyRound className="h-4 w-4" />
                    {isSubmitting ? "Actualizando..." : "Actualizar contraseña"}
                </Button>
            </form>
        </section>
    )
}
