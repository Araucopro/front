"use client"

import { useEffect, useMemo, useState } from "react"
import { getRoles } from "@/actions/roles/getRoles"
import { getAllStores } from "@/actions/stores/getAllStores"
import { createUser } from "@/actions/users/createUser"
import { getAllUsers } from "@/actions/users/getAllUsers"
import { addUserToStore } from "@/actions/userstores/addUserToStore"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { IStore } from "@/interfaces/stores/IStore"
import { buildUserRolePayload, getRoleAssignmentValue, getRoleDisplayName, LEGACY_ROLE_OPTIONS } from "@/lib/role-helpers"
import { Role } from "@/lib/userRoles"
import { useAuth } from "@/stores/user.store"
import { Building2 } from "lucide-react"
import { toast } from "sonner"

type RegistrationStep = "details" | "stores"

export default function RegistroForm() {
    const [nombre, setNombre] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [role, setRole] = useState("")
    const [step, setStep] = useState<RegistrationStep>("details")
    const [stores, setStores] = useState<IStore[]>([])
    const [selectedStores, setSelectedStores] = useState<string[]>([])
    const [createdUserID, setCreatedUserID] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoadingStores, setIsLoadingStores] = useState(true)
    const [tenantRoles, setTenantRoles] = useState<Array<{ value: string; label: string }>>([])

    const { setUsers } = useAuth()
    const requiresStoreAssignment = Boolean(role) && role !== Role.Admin

    useEffect(() => {
        Promise.allSettled([getRoles(), getAllStores()]).then(([rolesResult, storesResult]) => {
            if (rolesResult.status === "fulfilled") {
                setTenantRoles(
                    rolesResult.value.map((tenantRole) => ({
                        value: getRoleAssignmentValue(tenantRole),
                        label: getRoleDisplayName(tenantRole),
                    })),
                )
            }

            if (storesResult.status === "fulfilled") {
                setStores(storesResult.value)
            } else {
                toast.error("No se pudieron cargar las tiendas disponibles")
            }
            setIsLoadingStores(false)
        })
    }, [])

    const roleOptions = useMemo(() => {
        const options = tenantRoles.length > 0 ? tenantRoles : LEGACY_ROLE_OPTIONS
        return Array.from(new Map(options.map((option) => [option.value, option])).values())
    }, [tenantRoles])

    const toggleStore = (storeID: string) => {
        setSelectedStores((current) =>
            current.includes(storeID) ? current.filter((id) => id !== storeID) : [...current, storeID],
        )
    }

    const refreshUsers = async () => {
        try {
            const usuarios = await getAllUsers()
            setUsers(usuarios)
        } catch {
            toast.warning("El usuario fue guardado, pero no se pudo actualizar la lista")
        }
    }

    const resetForm = () => {
        setNombre("")
        setEmail("")
        setPassword("")
        setRole("")
        setStep("details")
        setSelectedStores([])
        setCreatedUserID(null)
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()

        if (!nombre.trim() || !email.trim() || !role || password.length < 8) {
            setStep("details")
            toast.error("Completa los datos y usa una clave de al menos 8 caracteres")
            return
        }

        if (requiresStoreAssignment && step === "details") {
            setStep("stores")
            return
        }

        if (requiresStoreAssignment && selectedStores.length === 0) {
            toast.error("Selecciona al menos una tienda para que el usuario pueda acceder")
            return
        }

        setIsSubmitting(true)
        try {
            let userID = createdUserID

            if (!userID) {
                const createdUser = await createUser({
                    name: nombre.trim(),
                    email: email.trim(),
                    ...buildUserRolePayload(role),
                    password,
                })
                userID = createdUser.userID
                setCreatedUserID(userID)
            }

            if (requiresStoreAssignment) {
                const results = await Promise.allSettled(
                    selectedStores.map((storeID) => addUserToStore(userID, storeID)),
                )
                const failedStoreIDs = selectedStores.filter((_, index) => results[index].status === "rejected")

                if (failedStoreIDs.length > 0) {
                    setSelectedStores(failedStoreIDs)
                    await refreshUsers()
                    toast.error(
                        failedStoreIDs.length === selectedStores.length
                            ? "El usuario fue creado, pero no se pudo asignar a la tienda. Puedes reintentar."
                            : "El usuario fue creado, pero algunas tiendas no pudieron asignarse. Puedes reintentar.",
                    )
                    return
                }
            }

            await refreshUsers()
            toast.success("Usuario creado y acceso configurado")
            resetForm()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al crear usuario")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-slate-800">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Crear usuario</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {step === "details" ? "Paso 1 de 2 · Datos y acceso" : "Paso 2 de 2 · Asignación de tienda"}
                    </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    {step === "details" ? "1 / 2" : "2 / 2"}
                </span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {step === "details" ? (
                    <>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300" htmlFor="nombre">
                                Nombre
                            </label>
                            <input
                                id="nombre"
                                type="text"
                                value={nombre}
                                onChange={(event) => setNombre(event.target.value)}
                                className="w-full rounded-md border border-gray-300 bg-transparent px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ingresa el nombre"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300" htmlFor="email">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="w-full rounded-md border border-gray-300 bg-transparent px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="ejemplo@gmail.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300" htmlFor="password">
                                Clave
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="w-full rounded-md border border-gray-300 bg-transparent px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Mínimo 8 caracteres"
                                minLength={8}
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300" htmlFor="role">
                                Tipo de usuario
                            </label>
                            <Select value={role} onValueChange={setRole} required>
                                <SelectTrigger className="w-full" id="role">
                                    <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roleOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {role === Role.Admin && (
                                <p className="mt-2 text-xs text-emerald-700">
                                    El administrador tiene acceso global y no necesita asignación manual de tienda.
                                </p>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                            <div className="flex gap-3">
                                <Building2 className="mt-0.5 h-5 w-5 shrink-0" />
                                <p>Selecciona al menos una tienda. Sin esta asignación, el usuario no podrá acceder a su operación.</p>
                            </div>
                        </div>

                        {isLoadingStores ? (
                            <p className="text-sm text-slate-500">Cargando tiendas...</p>
                        ) : stores.length === 0 ? (
                            <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                No hay tiendas disponibles. Crea una tienda antes de dar de alta a este usuario.
                            </p>
                        ) : (
                            <div className="grid max-h-64 gap-2 overflow-y-auto">
                                {stores.map((store) => {
                                    const selected = selectedStores.includes(store.storeID)
                                    const checkboxID = `registration-store-${store.storeID}`
                                    return (
                                        <div
                                            key={store.storeID}
                                            className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                                                selected
                                                    ? "border-emerald-500 bg-emerald-50"
                                                    : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"
                                            }`}
                                        >
                                            <Checkbox
                                                id={checkboxID}
                                                checked={selected}
                                                onCheckedChange={() => toggleStore(store.storeID)}
                                            />
                                            <Label htmlFor={checkboxID} className="min-w-0 flex-1 cursor-pointer">
                                                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{store.name}</p>
                                                {store.address && <p className="truncate text-xs text-slate-500">{store.address}</p>}
                                            </Label>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {createdUserID && (
                            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                La cuenta ya fue creada. Solo se reintentará la asignación pendiente.
                            </p>
                        )}
                    </div>
                )}

                <div className="flex gap-2">
                    {step === "stores" && !createdUserID && (
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("details")}>
                            Volver
                        </Button>
                    )}
                    <Button
                        type="submit"
                        disabled={isSubmitting || (step === "stores" && (isLoadingStores || stores.length === 0))}
                        className="flex-1 bg-blue-600 text-white transition-colors hover:bg-blue-700"
                    >
                        {isSubmitting
                            ? createdUserID
                                ? "Asignando..."
                                : "Creando..."
                            : step === "stores"
                              ? createdUserID
                                  ? "Reintentar asignación"
                                  : "Crear y asignar"
                              : requiresStoreAssignment
                                ? "Continuar a tiendas"
                                : "Crear usuario"}
                    </Button>
                </div>
            </form>
        </div>
    )
}
