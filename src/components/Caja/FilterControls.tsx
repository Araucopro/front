"use client"

import { useTienda } from "@/stores/tienda.store"
import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { es } from "react-day-picker/locale"
import { IStore } from "@/interfaces/stores/IStore"
import { Building2 } from "lucide-react"

interface FilterControlsProps {
    stores?: IStore[]
    variant?: "default" | "channel"
}

const specialStoreFilters = new Set(["all", "propias", "consignadas"])

const FilterControls = ({ stores: storesProp, variant = "default" }: FilterControlsProps) => {
    const { stores: storesFromZustand, storeSelected, setStoreSelected } = useTienda()
    const stores = storesProp ?? storesFromZustand

    const path = usePathname()
    const params = useSearchParams()
    const router = useRouter()

    const dateParam = params.get("date")
    const storeIDParam = params.get("storeID")

    const [year, month, day] = dateParam
        ? dateParam.split("-").map(Number)
        : [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()]

    const dateObj = new Date(year, month - 1, day, 23, 59, 59, 999)
    const [date, setDate] = useState<Date>(dateObj)

    useEffect(() => {
        if (!storeIDParam) return

        if (specialStoreFilters.has(storeIDParam)) {
            if (storeSelected) setStoreSelected(null)
            return
        }

        const selectedStore = stores.find((store) => store.storeID === storeIDParam)
        if (selectedStore && storeSelected?.storeID !== selectedStore.storeID) {
            setStoreSelected(selectedStore)
        }
    }, [storeIDParam, storeSelected, stores, setStoreSelected])

    const handleDateChange = (date: Date | undefined) => {
        const newDate = date ?? new Date()
        const params = new URLSearchParams({ storeID: storeIDParam ?? "", date: format(newDate, "yyyy-MM-dd") })
        router.push(`${path}?${params.toString()}`)
        setDate(date ? date : new Date())
    }

    const handleStoreChange = (val: string) => {
        const newParams = new URLSearchParams(params.toString())
        newParams.set("storeID", val)
        const selectedStore = stores.find((store) => store.storeID === val)
        setStoreSelected(selectedStore ?? null)
        router.push(`${path}?${newParams.toString()}`)
    }

    const storeSelect = (
        <Select value={storeIDParam || "all"} onValueChange={handleStoreChange}>
            <SelectTrigger
                className={
                    variant === "channel"
                        ? "h-12 w-full rounded-lg border-slate-200 bg-white text-sm font-semibold shadow-sm dark:border-slate-700 dark:bg-slate-900"
                        : "w-full bg-white dark:bg-slate-900 sm:w-[220px]"
                }
            >
                <span className="flex min-w-0 items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-blue-500" />
                    <SelectValue placeholder="Todos los canales de venta" />
                </span>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos los canales de venta</SelectItem>
                <SelectItem value="propias">Tiendas propias</SelectItem>
                <SelectItem value="consignadas">Tiendas consignadas</SelectItem>
                <hr className="my-2 border-gray-100 dark:border-gray-800" />
                {stores.map((store) => (
                    <SelectItem key={store.storeID} value={store.storeID}>
                        {store.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )

    if (variant === "channel") {
        return <div className="w-full">{storeSelect}</div>
    }

    return (
        <div className="flex flex-col sm:flex-row gap-3 lg:gap-1 lg:flex-1">
            {storeSelect}
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder={format(date, "dd-MM-yyyy")}>
                        {date ? format(date, "dd-MM-yyyy") : ""}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent className="p-2">
                    <Calendar
                        mode="single"
                        locale={es}
                        selected={date}
                        onSelect={handleDateChange}
                        className="rounded-md"
                        captionLayout="dropdown"
                    />
                </SelectContent>
            </Select>
            <Button
                variant="outline"
                onClick={() => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    handleDateChange(today)
                }}
            >
                Resetear fecha ✨
            </Button>
        </div>
    )
}

export default FilterControls
