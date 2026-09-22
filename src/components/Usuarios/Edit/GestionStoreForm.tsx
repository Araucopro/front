"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { IStore } from "@/interfaces/stores/IStore"
import type { IUserStoreRelation } from "@/interfaces/common/IUserStoreRelation"
import { useTienda } from "@/stores/tienda.store"
import { getAllStores } from "@/actions/stores/getAllStores"
import { updateStore } from "@/actions/stores/updateStore"
import { addUserToStore } from "@/actions/userstores/addUserToStore"
import { removeUserStore } from "@/actions/userstores/removeUserStore"
import ModalUserTienda from "./ModalGestion"
import {
    Store,
    User,
    Plus,
    Trash2,
    Save,
    X,
    Building,
    Phone,
    MapPin,
    Hash,
    Map,
    MapPinned,
    UserRoundCheck,
    AtSign,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RutInput } from "@/components/ui/rut-input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getAllUsers } from "@/actions/users/getAllUsers"
import { getValidStoreType, STORE_TYPE_OPTIONS, StoreType } from "@/lib/storeTypes"
import {
    getStoreUserRoleLabel,
    getStoreUserRoleRank,
    STORE_USER_ROLE_OPTIONS,
    StoreUserRole,
    type StoreUserRoleValue,
} from "@/lib/storeUserRoles"
import { useAuth } from "@/stores/user.store"

interface GestionStoreFormProps {
    isOpen: boolean
    onClose: () => void
    tienda: IStore
    userStoreRelations: IUserStoreRelation[]
    onUserStoresChange?: () => Promise<void> | void
}

export default function GestionStoreForm({
    isOpen,
    onClose,
    tienda,
    userStoreRelations,
    onUserStoresChange,
}: GestionStoreFormProps) {
    const { users, setUsers } = useAuth()
    const { setStores } = useTienda()
    const initialStoreType = getValidStoreType(tienda.type ?? tienda.role)
    const [nombre, setNombre] = useState(tienda.name)
    const [rut] = useState(tienda.rut)
    const [location, setlocation] = useState(tienda.location)
    const [ciudad, setCiudad] = useState(tienda.city)
    const [address, setAddress] = useState(tienda.address)
    const [telefono, setTelefono] = useState(tienda.phone)
    const [storeTypeSelected, setStoreTypeSelected] = useState(initialStoreType)
    const [email, setEmail] = useState(tienda.email)
    const [isCentralLocal, setIsCentralLocal] = useState<boolean>(
        tienda.isCentralStore ?? tienda.isAdminStore ?? initialStoreType === StoreType.Central,
    )
    const [gestoresAsignados, setGestoresAsignados] = useState<IUserStoreRelation[]>(
        userStoreRelations.filter((relation) => relation.store?.storeID === tienda.storeID),
    )
    const [selectedUserId, setSelectedUserId] = useState("")
    const [selectedUserRole, setSelectedUserRole] = useState<StoreUserRoleValue>(StoreUserRole.StoreManager)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const assignedRelations = userStoreRelations.filter((relation) => relation.store?.storeID === tienda.storeID)
        setGestoresAsignados(assignedRelations)
    }, [userStoreRelations, tienda.storeID])

    const usuariosDisponibles = users.filter(
        (user) => !gestoresAsignados.some((relation) => relation.user?.userID === user.userID),
    )

    const gestoresOrdenados = [...gestoresAsignados].sort(
        (a, b) => getStoreUserRoleRank(a.role ?? a.user?.role) - getStoreUserRoleRank(b.role ?? b.user?.role),
    )

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            if (
                !nombre.trim() ||
                !location.trim() ||
                !ciudad.trim() ||
                !address.trim() ||
                !telefono.trim() ||
                !storeTypeSelected.trim() ||
                !email.trim()
            ) {
                toast.error("Por favor, completa todos los campos obligatorios.")
                return
            }

            await updateStore(tienda.storeID, {
                name: nombre.trim(),
                location: location.trim(),
                city: ciudad.trim(),
                address: address.trim(),
                phone: telefono.trim(),
                type: storeTypeSelected.trim(),
                email: email.trim(),
                isCentralStore: isCentralLocal,
            })

            const [usuarios, tiendas] = await Promise.all([getAllUsers(), getAllStores()])

            setUsers(usuarios)
            setStores(tiendas)
            await onUserStoresChange?.()
            toast.success("Tienda actualizada exitosamente")
            onClose()
        } catch (error) {
            toast.error("Error al actualizar tienda")
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAgregarGestor = async () => {
        if (!selectedUserId || !selectedUserRole) return

        const usuario = users.find((u) => u.userID === selectedUserId)
        const alreadyAssigned = gestoresAsignados.some((relation) => relation.user?.userID === selectedUserId)

        if (!usuario) {
            toast.error("Usuario no encontrado")
            return
        }

        if (alreadyAssigned) {
            toast.info("Ese usuario ya esta asignado a esta tienda")
            return
        }

        try {
            const createdRelation = await addUserToStore(selectedUserId, tienda.storeID, selectedUserRole)
            const relationToAdd: IUserStoreRelation = {
                userStoreID: createdRelation.userStoreID ?? "",
                role: createdRelation.role ?? selectedUserRole,
                user: createdRelation.user ?? usuario,
                store: createdRelation.store ?? tienda,
                createdAt: createdRelation.createdAt ?? "",
                updatedAt: createdRelation.updatedAt ?? "",
            }

            setGestoresAsignados((prev) => [...prev, relationToAdd])
            setSelectedUserId("")
            setSelectedUserRole(StoreUserRole.StoreManager)
            await onUserStoresChange?.()
            toast.success("Gestor asignado exitosamente")
        } catch (error) {
            toast.error("Error al asignar gestor")
            console.error(error)
        }
    }

    const handleStoreTypeChange = (value: string) => {
        setStoreTypeSelected(value)
        setIsCentralLocal(value === StoreType.Central)
    }

    const handleEliminarGestor = async (relation: IUserStoreRelation) => {
        if (!relation.userStoreID) {
            toast.error("No se encontro la relacion usuario-tienda")
            return
        }

        try {
            await removeUserStore(relation.userStoreID)
            setGestoresAsignados((prev) => prev.filter((item) => item.userStoreID !== relation.userStoreID))
            await onUserStoresChange?.()
            toast.success("Gestor removido exitosamente")
        } catch (error) {
            toast.error("Error al remover gestor")
            console.error(error)
        }
    }

    const validateForm = () => {
        return (
            nombre.trim() !== "" &&
            location.trim() !== "" &&
            ciudad.trim() !== "" &&
            address.trim() !== "" &&
            telefono.trim() !== "" &&
            storeTypeSelected.trim() !== "" &&
            email.trim() !== ""
        )
    }

    return (
        <ModalUserTienda isOpen={isOpen} onClose={onClose} title="Gestionar Tienda" maxWidth="max-w-4xl">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-lg font-medium dark:text-white text-gray-700">
                        <Building className="w-5 h-5" />
                        <span>Informacion de la Tienda</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                                <Store className="w-4 h-4" />
                                Nombre *
                            </Label>
                            <Input
                                id="nombre"
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="Nombre de la tienda"
                                required
                                className="bg-slate-100 dark:border-sky-50 dark:bg-slate-800"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                                <Hash className="w-4 h-4" />
                                Rut
                            </Label>
                            <RutInput
                                id="rut"
                                value={rut}
                                placeholder="Rut de la tienda"
                                disabled
                                className="bg-slate-100 dark:bg-slate-800"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                                <Map className="w-4 h-4" />
                                Location *
                            </Label>
                            <Input
                                id="location"
                                type="text"
                                value={location}
                                onChange={(e) => setlocation(e.target.value)}
                                placeholder="Location de la tienda"
                                required
                                className="bg-slate-100 dark:border-sky-50 dark:bg-slate-800"
                            />
                        </div>

                        <div>
                            <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                                <MapPinned className="w-4 h-4" />
                                Ciudad *
                            </Label>
                            <Input
                                id="ciudad"
                                type="text"
                                value={ciudad}
                                onChange={(e) => setCiudad(e.target.value)}
                                placeholder="Ciudad"
                                required
                                className="bg-slate-100 dark:border-sky-50 dark:bg-slate-800"
                            />
                        </div>

                        <div>
                            <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                Direccion *
                            </Label>
                            <Input
                                id="address"
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Direccion de tienda"
                                required
                                className="bg-slate-100 dark:border-sky-50 dark:bg-slate-800"
                            />
                        </div>

                        <div>
                            <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                Telefono *
                            </Label>
                            <Input
                                id="telefono"
                                type="tel"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                placeholder="Telefono"
                                required
                                className="bg-slate-100 dark:border-sky-50 dark:bg-slate-800"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="store-type"
                                className="text-sm flex font-medium text-gray-700 dark:text-white mb-1"
                            >
                                <UserRoundCheck className="w-4 h-4 mr-1" />
                                Tipo de tienda
                            </label>
                            <Select value={storeTypeSelected} onValueChange={handleStoreTypeChange} required>
                                <SelectTrigger
                                    id="store-type"
                                    className="w-full bg-slate-100 dark:bg-slate-800 dark:border-sky-50 dark:border p-2 rounded-md text-sm text-slate-700 dark:text-white"
                                >
                                    <SelectValue placeholder="Selecciona tipo" />
                                </SelectTrigger>

                                <SelectContent className="dark:bg-gray-800 p-2 rounded-md bg-slate-300">
                                    {STORE_TYPE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                                <AtSign className="w-4 h-4" />
                                Email *
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                required
                                className="bg-slate-100 dark:border-sky-50 dark:bg-slate-800"
                            />
                        </div>
                        <div className="mt-4">
                            <label className="text-sm font-medium text-gray-700 dark:text-white mb-1 block">
                                Es tienda central?
                            </label>

                            <RadioGroup
                                value={isCentralLocal ? "yes" : "no"}
                                onValueChange={(value) => setIsCentralLocal(value === "yes")}
                                className="flex gap-4 mt-1"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="yes" id="central-yes" />
                                    <label htmlFor="central-yes" className="text-sm text-gray-700 dark:text-white">
                                        Si
                                    </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="no" id="central-no" />
                                    <label htmlFor="central-no" className="text-sm text-gray-700 dark:text-white">
                                        No
                                    </label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-lg font-medium dark:text-white text-gray-700">
                        <User className="w-5 h-5" />
                        <span>Gestores Asignados</span>
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row">
                        <Select
                            value={selectedUserId}
                            onValueChange={setSelectedUserId}
                            disabled={usuariosDisponibles.length === 0}
                        >
                            <SelectTrigger
                                title="Gestor"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-100 dark:bg-slate-800 text-sm transition-all"
                            >
                                <SelectValue
                                    placeholder={
                                        usuariosDisponibles.length === 0
                                            ? "No hay usuarios disponibles"
                                            : "Seleccionar gestor"
                                    }
                                />
                            </SelectTrigger>

                            <SelectContent className="bg-slate-100 dark:bg-slate-800">
                                {usuariosDisponibles.map((user) => (
                                    <SelectItem
                                        key={user.userID}
                                        value={user.userID}
                                        className="dark:bg-slate-800 data-[highlighted]:bg-gray-700"
                                    >
                                        {user.name} ({user.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedUserRole} onValueChange={(value) => setSelectedUserRole(value as StoreUserRoleValue)}>
                            <SelectTrigger
                                title="Rol del gestor"
                                className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md bg-slate-100 dark:bg-slate-800 text-sm"
                            >
                                <SelectValue placeholder="Rol" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-100 dark:bg-slate-800">
                                {STORE_USER_ROLE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            type="button"
                            onClick={handleAgregarGestor}
                            disabled={!selectedUserId || !selectedUserRole}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Agregar</span>
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {gestoresOrdenados.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:bg-slate-700 bg-gray-50 rounded-md">
                                <User className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                <p>No hay gestores asignados</p>
                            </div>
                        ) : (
                            gestoresOrdenados.map((relation, index) => {
                                const gestor = relation.user
                                if (!gestor) return null

                                return (
                                    <motion.div
                                        key={relation.userStoreID || gestor.userID}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex items-center justify-between p-4 dark:bg-slate-700 bg-green-50 border border-green-200 rounded-md"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                                <User className="w-5 h-5 text-green-600" />
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {gestor.name}
                                                    </span>
                                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-600 dark:text-slate-100">
                                                        {getStoreUserRoleLabel(relation.role ?? gestor.role)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-300">{gestor.email}</p>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={() => handleEliminarGestor(relation)}
                                            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </motion.div>
                                )
                            })
                        )}
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <Button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="bg-gray-200 dark:bg-slate-700 dark:hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        <X className="w-4 h-4" />
                        <span>Cancelar</span>
                    </Button>
                    <Button
                        type="submit"
                        disabled={!validateForm() || isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        <Save className="w-4 h-4" />
                        <span>{isLoading ? "Guardando..." : "Guardar Cambios"}</span>
                    </Button>
                </div>
            </form>
        </ModalUserTienda>
    )
}
