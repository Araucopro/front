import { ChangePasswordForm } from "@/components/Configuracion/ChangePasswordForm"

export default function SeguridadPage() {
    return (
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 sm:px-6 lg:px-8">
            <div className="mb-7">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Seguridad</h1>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                    Administra el acceso a tu cuenta.
                </p>
            </div>
            <ChangePasswordForm />
        </main>
    )
}
