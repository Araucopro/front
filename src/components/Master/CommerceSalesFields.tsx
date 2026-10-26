"use client"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { ICreateCommerceChannel } from "@/interfaces/master/ICommerceChannel"

type SalesSettings = Pick<ICreateCommerceChannel, "salesEnabled" | "acceptTestPayments" | "requireProductPhoto">

interface Props {
    idPrefix: string
    value: SalesSettings
    disabled: boolean
    onChange: (patch: SalesSettings) => void
}

export default function CommerceSalesFields({ idPrefix, value, disabled, onChange }: Props) {
    return (
        <div className="space-y-3 rounded-lg border border-[#dfe2e7] bg-[#f7f8fa] p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <Label htmlFor={`${idPrefix}-sales`} className="text-xs font-semibold text-[#122238]">Registrar ventas del ecommerce</Label>
                    <p id={`${idPrefix}-sales-description`} className="text-xs text-[#536174]">Crea un comprobante de venta, descuenta stock y registra el ingreso en la tienda de origen.</p>
                </div>
                <Switch className="data-[state=checked]:bg-[#0e5c3b]" id={`${idPrefix}-sales`} checked={value.salesEnabled === true} disabled={disabled}
                    aria-describedby={`${idPrefix}-sales-description`}
                    onCheckedChange={(checked) => onChange({ salesEnabled: checked })} />
            </div>
            <div className="flex items-start justify-between gap-4 border-t border-[#dfe2e7] pt-3">
                <div className="space-y-1">
                    <Label htmlFor={`${idPrefix}-test-payments`} className="text-xs font-semibold text-[#122238]">Aceptar pagos de prueba</Label>
                    <p id={`${idPrefix}-test-description`} className="text-xs text-amber-800">Úsalo en una tienda de pruebas: las compras simuladas también descuentan stock y registran ingresos.</p>
                </div>
                <Switch className="data-[state=checked]:bg-[#0e5c3b]" id={`${idPrefix}-test-payments`} checked={value.acceptTestPayments === true} disabled={disabled}
                    aria-describedby={`${idPrefix}-test-description`}
                    onCheckedChange={(checked) => onChange({ acceptTestPayments: checked })} />
            </div>
            <div className="flex items-start justify-between gap-4 border-t border-[#dfe2e7] pt-3">
                <div className="space-y-1">
                    <Label htmlFor={`${idPrefix}-require-photo`} className="text-xs font-semibold text-[#122238]">Exigir foto para publicar</Label>
                    <p id={`${idPrefix}-photo-description`} className="text-xs text-[#536174]">Desactívalo para mostrar productos sin foto. La descripción es opcional y la web genera el enlace si falta.</p>
                </div>
                <Switch className="data-[state=checked]:bg-[#0e5c3b]" id={`${idPrefix}-require-photo`} checked={value.requireProductPhoto !== false} disabled={disabled}
                    aria-describedby={`${idPrefix}-photo-description`}
                    onCheckedChange={(checked) => onChange({ requireProductPhoto: checked })} />
            </div>
        </div>
    )
}
