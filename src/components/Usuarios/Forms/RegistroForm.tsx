"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createUser } from "@/actions/users/createUser"
import { useAuth } from "@/stores/user.store"
import { toast } from "sonner"
import { getAllUsers } from "@/actions/users/getAllUsers"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getRoles } from "@/actions/roles/getRoles"
import { buildUserRolePayload, getRoleAssignmentValue, getRoleDisplayName, LEGACY_ROLE_OPTIONS } from "@/lib/role-helpers"

export default function RegistroForm() {
    const [nombre, setNombre] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [role, setRole] = useState("")

    const router = useRouter()
    const { setUsers, users } = useAuth()
    const [tenantRoles, setTenantRoles] = useState<Array<{ value: string; label: string }>>([])

    useEffect(() => {
        getRoles()
            .then((roles) => {
                setTenantRoles(
                    roles.map((role) => ({
                        value: getRoleAssignmentValue(role),
                        label: getRoleDisplayName(role),
                    })),
                )
            })
            .catch(() => setTenantRoles([]))
    }, [])

    const roleOptions = useMemo(() => {
        const options = tenantRoles.length > 0 ? tenantRoles : LEGACY_ROLE_OPTIONS
        return Array.from(new Map(options.map((option) => [option.value, option])).values())
    }, [tenantRoles])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await createUser({
                name: nombre,
                email: email,
                ...buildUserRolePayload(role),
                password: password,
            })

            toast.success("Usuario creado exitosamente")
            const [usuarios] = await Promise.all([getAllUsers()])
            setUsers(usuarios)
            // Limpiar formulario
            setNombre("")
            setEmail("")
            setPassword("")
            setRole("")
        } catch (error) {
            toast.error("Error al crear usuario")
            console.error(error)
        }
    }

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4 dark:text-white text-gray-800">Crear usuarios</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label
                        className="block text-sm font-medium mb-1 dark:text-slate-500 text-gray-700"
                        htmlFor="nombre"
                    >
                        Nombre
                    </label>
                    <input
                        id="nombre"
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-full px-4 py-2 border bg-transparent border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ingresa el nombre"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-500 text-gray-700" htmlFor="email">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border bg-transparent border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ejemplo@gmail.com"
                        required
                    />
                </div>

                <div>
                    <label
                        className="block text-sm font-medium mb-1 dark:text-slate-500 text-gray-700"
                        htmlFor="password"
                    >
                        Clave
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 border bg-transparent border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="••••••••"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-500 text-gray-700" htmlFor="role">
                        Tipo de Usuario
                    </label>
                    <Select value={role} onValueChange={(value) => setRole(value)} required>
                        <SelectTrigger className="w-full">
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
                </div>

                <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
                >
                    Crear Usuario
                </Button>
            </form>
        </div>
    )
}
