"use client"

import { Building2, Check, Globe, Store } from "lucide-react"
import type { IOfferOptions, OfferSalesChannel } from "@/interfaces/pricing/IPricing"

export function DiscountCoverageField({ options, channels, storeIDs, singleStore, onChange }: {
    options: IOfferOptions; channels: OfferSalesChannel[]; storeIDs: string[]; singleStore: boolean
    onChange: (channels: OfferSalesChannel[], storeIDs: string[]) => void
}) {
    return <section className="space-y-3" aria-label="Alcance del descuento">
        <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Alcance</h3>
            <p className="mt-1 text-xs text-slate-500">Elige dónde estará activo. Puedes seleccionar ambos canales.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
            {([
                ["PHYSICAL", "Tienda física", "Ventas en caja", Store],
                ["ONLINE", "Tienda online", "Ecommerce de tu empresa", Globe],
            ] as const).map(([channel, title, detail, Icon]) => {
                const selected = channels.includes(channel)
                const available = options.salesChannels.includes(channel)
                return <button key={channel} type="button" aria-pressed={selected} disabled={!available}
                    onClick={() => onChange(selected ? channels.filter((current) => current !== channel) : [...channels, channel], storeIDs)}
                    className={`relative rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${selected ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600 dark:bg-blue-950/30" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"}`}>
                    <Icon className="mb-2 h-5 w-5 text-blue-600" aria-hidden="true" />
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="mt-1 block text-xs text-slate-500">{available ? detail : "Sin ecommerce activo"}</span>
                    {selected && <Check className="absolute right-3 top-3 h-4 w-4 text-blue-600" aria-hidden="true" />}
                </button>
            })}
        </div>
        <fieldset className="space-y-2">
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{options.stores.length > 1 ? "Sucursales donde aplica" : "Tienda donde aplica"}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
                {options.stores.map((store) => {
                    const selected = storeIDs.includes(store.storeID)
                    return <button key={store.storeID} type="button" aria-pressed={selected}
                        onClick={() => onChange(channels, singleStore ? [store.storeID] : selected ? storeIDs.filter((id) => id !== store.storeID) : [...storeIDs, store.storeID])}
                        className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm ${selected ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"}`}>
                        <Building2 className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                        <span className="flex-1">{store.name}<span className="block text-xs text-slate-500">{store.onlineEnabled ? "Caja y ecommerce" : "Caja"}</span></span>
                        {selected && <Check className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />}
                    </button>
                })}
            </div>
            {singleStore && <p className="text-xs text-slate-500">Las promociones por variante y los combos se vinculan a una sola sucursal.</p>}
        </fieldset>
        {channels.includes("ONLINE") && !options.stores.some((store) => storeIDs.includes(store.storeID) && store.onlineEnabled) && <p role="alert" className="text-xs text-amber-700">Selecciona una sucursal vinculada al ecommerce.</p>}
    </section>
}
