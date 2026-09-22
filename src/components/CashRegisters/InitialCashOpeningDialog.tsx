"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    getActiveCashSession,
    getCashRegisters,
    openCashSession,
} from "@/actions/cash-registers/cashRegisters"
import { Button } from "@/components/ui/button"
import { CurrencyInput } from "@/components/ui/currency-input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ICashRegister } from "@/interfaces/cash-registers/ICashRegister"
import { notifyCashSessionChanged } from "@/lib/cash-session-events"
import { Role } from "@/lib/userRoles"
import { useTienda } from "@/stores/tienda.store"
import { useAuth } from "@/stores/user.store"
import { Banknote, LoaderCircle, Settings2, Store } from "lucide-react"
import { toast } from "sonner"

const getTodayValue = () => {
    const date = new Date()
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

export default function InitialCashOpeningDialog() {
    const router = useRouter()
    const user = useAuth((state) => state.user)
    const storeSelected = useTienda((state) => state.storeSelected)
    const [open, setOpen] = useState(false)
    const [registers, setRegisters] = useState<ICashRegister[]>([])
    const [selectedRegisterID, setSelectedRegisterID] = useState("")
    const [businessDate, setBusinessDate] = useState(getTodayValue)
    const [openingBalance, setOpeningBalance] = useState("")
    const [openingNotes, setOpeningNotes] = useState("")
    const [isChecking, setIsChecking] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [checkError, setCheckError] = useState<string | null>(null)

    const storeID = storeSelected?.storeID ?? ""
    const canOperateCash = Boolean(
        user && user.role !== Role.Consignado && user.role !== Role.Tercero,
    )

    const checkCashOpening = useCallback(async () => {
        if (!storeID || !canOperateCash) {
            setOpen(false)
            setRegisters([])
            return
        }

        setIsChecking(true)
        setCheckError(null)
        try {
            const activeRegisters = await getCashRegisters({ storeID, status: "ACTIVE" })
            const sessionResults = await Promise.allSettled(
                activeRegisters.map((register) => getActiveCashSession(register.cashRegisterID)),
            )
            const hasOpenSession = sessionResults.some(
                (result) => result.status === "fulfilled" && Boolean(result.value),
            )

            if (hasOpenSession) {
                setOpen(false)
                setRegisters([])
                return
            }

            setRegisters(activeRegisters)
            setSelectedRegisterID(activeRegisters[0]?.cashRegisterID ?? "")
            setBusinessDate(getTodayValue())
            setOpeningBalance("")
            setOpeningNotes("")
            setOpen(true)
        } catch (error) {
            setRegisters([])
            setSelectedRegisterID("")
            setCheckError(error instanceof Error ? error.message : "No se pudo revisar el estado de las cajas")
            setOpen(true)
        } finally {
            setIsChecking(false)
        }
    }, [canOperateCash, storeID])

    useEffect(() => {
        void checkCashOpening()
    }, [checkCashOpening])

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const balance = Number(openingBalance)

        if (!selectedRegisterID) {
            toast.error("Selecciona una caja")
            return
        }
        if (openingBalance.trim() === "" || !Number.isFinite(balance) || balance < 0) {
            toast.error("Ingresa un fondo inicial válido")
            return
        }

        setIsSubmitting(true)
        try {
            await openCashSession(selectedRegisterID, {
                businessDate,
                openingBalance: balance,
                ...(openingNotes.trim() ? { openingNotes: openingNotes.trim() } : {}),
            })
            notifyCashSessionChanged()
            toast.success("Turno de caja abierto correctamente")
            setOpen(false)
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudo abrir el turno"
            toast.error(message)
            await checkCashOpening()
        } finally {
            setIsSubmitting(false)
        }
    }

    const goToCashConfiguration = () => {
        setOpen(false)
        router.push(`/home/cajas?storeID=${storeID}`)
    }

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !isSubmitting && setOpen(nextOpen)}>
            <DialogContent className="max-w-lg">
                <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
                    <DialogTitle className="flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-emerald-600" />
                        Configura tu caja inicial
                    </DialogTitle>
                    <DialogDescription>
                        {storeSelected?.name
                            ? `Abre el turno para comenzar a operar en ${storeSelected.name}.`
                            : "Abre el turno para comenzar a operar."}
                    </DialogDescription>
                </DialogHeader>

                {isChecking ? (
                    <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-slate-500">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Revisando las cajas de la tienda...
                    </div>
                ) : checkError ? (
                    <div className="space-y-4 px-6 py-5">
                        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                            {checkError}
                        </p>
                        <Button type="button" variant="outline" className="w-full" onClick={() => void checkCashOpening()}>
                            Reintentar
                        </Button>
                    </div>
                ) : registers.length === 0 ? (
                    <div className="space-y-4 px-6 py-5">
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                            <div className="flex gap-3">
                                <Store className="mt-0.5 h-5 w-5 shrink-0" />
                                <div>
                                    <p className="font-bold">No hay una caja activa configurada</p>
                                    <p className="mt-1 text-xs leading-5">
                                        Primero crea o activa una caja para esta tienda y luego podrás ingresar el fondo inicial.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <Button type="button" className="w-full" onClick={goToCashConfiguration}>
                            <Settings2 className="h-4 w-4" />
                            Ir a Configuración de cajas
                        </Button>
                    </div>
                ) : (
                    <form id="initial-cash-opening-form" onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                            Indica con cuánto efectivo comienza el turno. Este valor quedará registrado para el cierre y arqueo de caja.
                        </div>

                        <div>
                            <Label className="mb-2 block">Caja *</Label>
                            <Select value={selectedRegisterID} onValueChange={setSelectedRegisterID}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una caja" />
                                </SelectTrigger>
                                <SelectContent>
                                    {registers.map((register) => (
                                        <SelectItem key={register.cashRegisterID} value={register.cashRegisterID}>
                                            {register.name} · {register.code}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="initial-business-date" className="mb-2 block">
                                    Fecha contable *
                                </Label>
                                <Input
                                    id="initial-business-date"
                                    type="date"
                                    value={businessDate}
                                    onChange={(event) => setBusinessDate(event.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="initial-opening-balance" className="mb-2 block">
                                    Fondo inicial *
                                </Label>
                                <CurrencyInput
                                    id="initial-opening-balance"
                                    value={openingBalance}
                                    onValueChange={setOpeningBalance}
                                    placeholder="$ 0"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="initial-opening-notes" className="mb-2 block">
                                Notas de apertura
                            </Label>
                            <Textarea
                                id="initial-opening-notes"
                                value={openingNotes}
                                onChange={(event) => setOpeningNotes(event.target.value)}
                                placeholder="Ej.: turno mañana, sencillo recibido..."
                            />
                        </div>
                    </form>
                )}

                {!isChecking && !checkError && registers.length > 0 && (
                    <DialogFooter className="border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                        <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setOpen(false)}>
                            Ahora no
                        </Button>
                        <Button
                            type="submit"
                            form="initial-cash-opening-form"
                            disabled={isSubmitting}
                            className="bg-emerald-700 text-white hover:bg-emerald-800"
                        >
                            {isSubmitting ? (
                                <>
                                    <LoaderCircle className="h-4 w-4 animate-spin" /> Abriendo turno...
                                </>
                            ) : (
                                "Abrir turno"
                            )}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
