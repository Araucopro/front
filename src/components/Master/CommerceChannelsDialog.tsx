"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Check, Clipboard, Loader2, Plus, RefreshCw, RotateCcw, Store } from "lucide-react"
import { toast } from "sonner"
import {
    createCommerceChannel,
    getCommerceChannels,
    rotateCommerceChannelToken,
    updateCommerceChannel,
} from "@/actions/master/commerceChannelActions"
import { getTenant } from "@/actions/master/tenantActions"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ICommerceChannel, ICreateCommerceChannel, IUpdateCommerceChannel } from "@/interfaces/master/ICommerceChannel"
import type { ITenant } from "@/interfaces/master/ITenant"
import type { IStore } from "@/interfaces/stores/IStore"
import { useMasterAuth } from "@/stores/master.store"

type TenantReference = Pick<ITenant, "tenantID" | "name" | "status">

interface CommerceChannelsDialogProps {
    open: boolean
    tenant: TenantReference | null
    onOpenChange: (open: boolean) => void
}

const EMPTY_FORM: ICreateCommerceChannel = { code: "", name: "", storeID: "", domain: "" }
const fieldClass = "flex h-10 w-full rounded-md border border-[#dfe2e7] bg-white px-3 text-sm text-[#122238] outline-none focus:ring-2 focus:ring-[#0e5c3b] disabled:bg-[#f5f6f8]"

function channelError(error: unknown) {
    return error instanceof Error ? error.message : "No se pudo completar la operación"
}

export default function CommerceChannelsDialog({ open, tenant, onOpenChange }: CommerceChannelsDialogProps) {
    const masterUser = useMasterAuth((state) => state.masterUser)
    const canManage = masterUser?.role === "SUPER_ADMIN"
    const [channels, setChannels] = useState<ICommerceChannel[]>([])
    const [stores, setStores] = useState<IStore[]>([])
    const [form, setForm] = useState<ICreateCommerceChannel>(EMPTY_FORM)
    const [editingID, setEditingID] = useState("")
    const [editForm, setEditForm] = useState<IUpdateCommerceChannel>({})
    const [confirmRotationID, setConfirmRotationID] = useState("")
    const [issuedToken, setIssuedToken] = useState("")
    const [copied, setCopied] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState("")

    const load = useCallback(async () => {
        if (!tenant) return
        setIsLoading(true)
        setError("")
        try {
            const [tenantDetail, channelList] = await Promise.all([
                getTenant(tenant.tenantID),
                getCommerceChannels(tenant.tenantID),
            ])
            setStores(tenantDetail.stores ?? [])
            setChannels(channelList)
        } catch (loadError) {
            setError(channelError(loadError))
        } finally {
            setIsLoading(false)
        }
    }, [tenant])

    useEffect(() => {
        if (!open) return
        setChannels([])
        setStores([])
        setForm(EMPTY_FORM)
        setEditingID("")
        setConfirmRotationID("")
        setIssuedToken("")
        setCopied(false)
        void load()
    }, [open, load])

    const close = (nextOpen: boolean) => {
        if (isSaving) return
        if (!nextOpen) {
            setIssuedToken("")
            setConfirmRotationID("")
        }
        onOpenChange(nextOpen)
    }

    const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!tenant || !canManage) return
        const payload = {
            code: form.code.trim().toUpperCase(),
            name: form.name.trim(),
            storeID: form.storeID,
            ...(form.domain?.trim() ? { domain: form.domain.trim() } : {}),
        }
        if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(payload.code)) {
            toast.error("El código debe tener entre 2 y 64 caracteres: letras mayúsculas, números o guion bajo")
            return
        }
        if (!payload.name || !payload.storeID) {
            toast.error("Completa nombre y tienda")
            return
        }
        setIsSaving(true)
        try {
            const created = await createCommerceChannel(tenant.tenantID, payload)
            const { token, ...channel } = created
            setChannels((current) => [...current, channel])
            setIssuedToken(token)
            setCopied(false)
            setForm(EMPTY_FORM)
            toast.success("Ecommerce asignado al tenant")
        } catch (saveError) {
            toast.error(channelError(saveError))
        } finally {
            setIsSaving(false)
        }
    }

    const beginEdit = (channel: ICommerceChannel) => {
        setEditingID(channel.channelID)
        setEditForm({ name: channel.name, domain: channel.domain ?? "", storeID: channel.storeID })
        setConfirmRotationID("")
    }

    const handleSave = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!tenant || !editingID || !canManage) return
        const payload = {
            name: editForm.name?.trim(),
            domain: editForm.domain?.trim() ?? "",
            storeID: editForm.storeID,
        }
        if (!payload.name || !payload.storeID) {
            toast.error("Completa nombre y tienda")
            return
        }
        setIsSaving(true)
        try {
            const updated = await updateCommerceChannel(tenant.tenantID, editingID, payload)
            setChannels((current) => current.map((item) => item.channelID === editingID ? updated : item))
            setEditingID("")
            toast.success("Ecommerce actualizado")
        } catch (saveError) {
            toast.error(channelError(saveError))
        } finally {
            setIsSaving(false)
        }
    }

    const handleStatus = async (channel: ICommerceChannel) => {
        if (!tenant || !canManage) return
        setIsSaving(true)
        try {
            const updated = await updateCommerceChannel(tenant.tenantID, channel.channelID, { active: !channel.active })
            setChannels((current) => current.map((item) => item.channelID === channel.channelID ? updated : item))
            toast.success(updated.active ? "Ecommerce activado" : "Ecommerce desactivado")
        } catch (saveError) {
            toast.error(channelError(saveError))
        } finally {
            setIsSaving(false)
        }
    }

    const handleRotate = async (channelID: string) => {
        if (!tenant || !canManage) return
        setIsSaving(true)
        try {
            const updated = await rotateCommerceChannelToken(tenant.tenantID, channelID)
            const { token, ...channel } = updated
            setChannels((current) => current.map((item) => item.channelID === channelID ? channel : item))
            setIssuedToken(token)
            setCopied(false)
            setConfirmRotationID("")
            toast.success("Token anterior invalidado")
        } catch (saveError) {
            toast.error(channelError(saveError))
        } finally {
            setIsSaving(false)
        }
    }

    const copyToken = async () => {
        try {
            await navigator.clipboard.writeText(issuedToken)
            setCopied(true)
            toast.success("Token copiado")
        } catch {
            toast.error("No se pudo copiar; selecciónalo manualmente")
        }
    }

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="max-w-3xl">
                <DialogHeader className="border-b border-[#e5e7eb] px-6 py-5">
                    <DialogTitle>Ecommerce del tenant</DialogTitle>
                    <DialogDescription>{tenant?.name ?? "Tenant"} · Vincula cada ecommerce a una sola tienda.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[72vh] space-y-5 overflow-y-auto bg-[#f7f8fa] px-6 py-5">
                    {issuedToken && (
                        <section className="rounded-lg border border-amber-300 bg-amber-50 p-4" aria-live="polite">
                            <h3 className="text-sm font-bold text-amber-950">Guarda el token ahora</h3>
                            <p className="mt-1 text-xs text-amber-900">Solo se muestra al crear o rotar. Configúralo como ARAUCOPRO_SERVICE_TOKEN en el servidor del ecommerce. Al rotarlo, el token anterior deja de funcionar.</p>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <Input aria-label="Token del ecommerce" value={issuedToken} readOnly onFocus={(event) => event.target.select()} className="font-mono text-xs" />
                                <button type="button" onClick={copyToken} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#122238] px-4 py-2 text-xs font-semibold text-white">
                                    {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                                    {copied ? "Copiado" : "Copiar"}
                                </button>
                            </div>
                            <button type="button" onClick={() => setIssuedToken("")} className="mt-3 text-xs font-semibold text-amber-900 underline">Ya lo guardé, ocultar</button>
                        </section>
                    )}

                    <section className="rounded-lg border border-[#dfe2e7] bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-extrabold text-[#122238]">Canales asignados</h3>
                                <p className="mt-1 text-xs text-[#758296]">Si no hay canales, el ERP sigue funcionando normalmente.</p>
                            </div>
                            <button type="button" onClick={() => void load()} disabled={isLoading || isSaving} aria-label="Actualizar canales" className="rounded-md border border-[#dfe2e7] p-2 text-[#536174] disabled:opacity-50">
                                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                            </button>
                        </div>
                        {error && <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-xs text-red-700">{error}</p>}
                        {isLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#0e5c3b]" /></div>
                        ) : !error && channels.length === 0 ? (
                            <p className="mt-4 rounded-md border border-dashed border-[#dfe2e7] p-4 text-center text-xs text-[#758296]">Este tenant no tiene ecommerce asignado.</p>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {channels.map((channel) => (
                                    <article key={channel.channelID} className="rounded-lg border border-[#dfe2e7] p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="text-sm font-bold text-[#122238]">{channel.name}</h4>
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${channel.active ? "bg-[#e8f5ee] text-[#0e5c3b]" : "bg-slate-100 text-slate-600"}`}>{channel.active ? "Activo" : "Inactivo"}</span>
                                                </div>
                                                <p className="mt-1 break-all font-mono text-[10px] text-[#758296]">{channel.code} · {channel.channelID}</p>
                                                <p className="mt-2 flex items-center gap-1.5 text-xs text-[#536174]"><Store className="h-3.5 w-3.5" />{stores.find((store) => store.storeID === channel.storeID)?.name ?? channel.storeID}</p>
                                                {channel.domain && <p className="mt-1 text-xs text-[#536174]">Dominio: {channel.domain}</p>}
                                            </div>
                                            {canManage && (
                                                <div className="flex flex-wrap gap-2">
                                                    <button type="button" onClick={() => beginEdit(channel)} disabled={isSaving} className="rounded-md border border-[#dfe2e7] px-3 py-1.5 text-xs font-semibold text-[#39485b] disabled:opacity-50">Editar</button>
                                                    <button type="button" onClick={() => void handleStatus(channel)} disabled={isSaving} className="rounded-md border border-[#dfe2e7] px-3 py-1.5 text-xs font-semibold text-[#39485b] disabled:opacity-50">{channel.active ? "Desactivar" : "Activar"}</button>
                                                    <button type="button" onClick={() => setConfirmRotationID(channel.channelID)} disabled={isSaving || !!issuedToken} className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" />Rotar token</button>
                                                </div>
                                            )}
                                        </div>
                                        {editingID === channel.channelID && (
                                            <form onSubmit={handleSave} className="mt-4 grid gap-3 border-t border-[#eceef1] pt-4 sm:grid-cols-2">
                                                <div><Label htmlFor="channel-edit-name">Nombre</Label><Input id="channel-edit-name" maxLength={160} required value={editForm.name ?? ""} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} /></div>
                                                <div><Label htmlFor="channel-edit-domain">Dominio opcional</Label><Input id="channel-edit-domain" maxLength={255} value={editForm.domain ?? ""} onChange={(event) => setEditForm((current) => ({ ...current, domain: event.target.value }))} /></div>
                                                <div className="sm:col-span-2"><Label htmlFor="channel-edit-store">Tienda de origen</Label><select id="channel-edit-store" className={fieldClass} required value={editForm.storeID ?? ""} onChange={(event) => setEditForm((current) => ({ ...current, storeID: event.target.value }))}>{stores.map((store) => <option key={store.storeID} value={store.storeID}>{store.name}</option>)}</select></div>
                                                <div className="flex gap-2 sm:col-span-2"><button type="submit" disabled={isSaving} className="rounded-md bg-[#0e5c3b] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Guardar cambios</button><button type="button" onClick={() => setEditingID("")} className="rounded-md border border-[#dfe2e7] px-4 py-2 text-xs">Cancelar</button></div>
                                            </form>
                                        )}
                                        {confirmRotationID === channel.channelID && (
                                            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                                El ecommerce dejará de conectarse hasta que configures el token nuevo en su servidor.
                                                <div className="mt-3 flex gap-2"><button type="button" onClick={() => void handleRotate(channel.channelID)} disabled={isSaving} className="rounded-md bg-amber-800 px-3 py-1.5 font-semibold text-white disabled:opacity-50">Confirmar rotación</button><button type="button" onClick={() => setConfirmRotationID("")} className="rounded-md border border-amber-300 px-3 py-1.5">Cancelar</button></div>
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>

                    {canManage && tenant?.status === "ACTIVE" && (
                        <form onSubmit={handleCreate} className="rounded-lg border border-[#dfe2e7] bg-white p-4">
                            <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#122238]"><Plus className="h-4 w-4 text-[#0e5c3b]" />Asignar ecommerce</h3>
                            <p className="mt-1 text-xs text-[#758296]">Selecciona la tienda cuyos productos, precios y stock verá esta web.</p>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div><Label htmlFor="channel-code">Código</Label><Input id="channel-code" placeholder="DESI_WEB" maxLength={64} required value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} /></div>
                                <div><Label htmlFor="channel-name">Nombre</Label><Input id="channel-name" placeholder="Ecommerce Desi" maxLength={160} required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
                                <div><Label htmlFor="channel-store">Tienda de origen</Label><select id="channel-store" className={fieldClass} required value={form.storeID} onChange={(event) => setForm((current) => ({ ...current, storeID: event.target.value }))}><option value="">Selecciona una tienda</option>{stores.map((store) => <option key={store.storeID} value={store.storeID}>{store.name}</option>)}</select></div>
                                <div><Label htmlFor="channel-domain">Dominio opcional</Label><Input id="channel-domain" placeholder="www.ejemplo.cl" maxLength={255} value={form.domain ?? ""} onChange={(event) => setForm((current) => ({ ...current, domain: event.target.value }))} /></div>
                            </div>
                            <button type="submit" disabled={isSaving || isLoading || !stores.length || !!error || !!issuedToken} className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#0e5c3b] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Crear canal y generar token</button>
                            {!stores.length && !isLoading && !error && <p className="mt-2 text-xs text-amber-800">Este tenant necesita una tienda antes de asignar un ecommerce.</p>}
                        </form>
                    )}
                    {tenant?.status !== "ACTIVE" && <p className="text-xs text-amber-800">El tenant debe estar activo para crear un canal nuevo.</p>}
                </div>
            </DialogContent>
        </Dialog>
    )
}
