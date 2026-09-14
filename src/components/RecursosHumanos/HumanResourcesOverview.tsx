"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    CalendarCheck,
    ChevronLeft,
    ChevronRight,
    Send,
    UserPlus,
} from "lucide-react"

type DayStatus = "working" | "permission" | "vacation" | "holiday" | "license" | "inactive"

type CalendarDay = {
    date: Date
    isCurrentMonth: boolean
}

const weekdayLabels = [
    { short: "Lun", full: "LUN" },
    { short: "Mar", full: "MAR" },
    { short: "Mie", full: "MIE" },
    { short: "Jue", full: "JUE" },
    { short: "Vie", full: "VIE" },
    { short: "Sab", full: "SAB" },
    { short: "Dom", full: "DOM" },
]

const statusStyles: Record<DayStatus, { label: string; color: string; className: string }> = {
    working: {
        label: "Trabajando",
        color: "bg-emerald-500",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    },
    permission: {
        label: "Permiso",
        color: "bg-amber-500",
        className: "border-amber-200 bg-amber-50 text-amber-800",
    },
    vacation: {
        label: "Vacaciones",
        color: "bg-sky-500",
        className: "border-sky-200 bg-sky-50 text-sky-800",
    },
    holiday: {
        label: "Feriado",
        color: "bg-purple-500",
        className: "border-purple-200 bg-purple-50 text-purple-800",
    },
    license: {
        label: "Licencia",
        color: "bg-rose-500",
        className: "border-rose-200 bg-rose-50 text-rose-700",
    },
    inactive: {
        label: "Sin actividad",
        color: "bg-slate-200",
        className: "border-slate-200 bg-slate-50 text-slate-500",
    },
}

const monthFormatter = new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
})

const selectedDateFormatter = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
})

const mockStatusByDate: Record<string, DayStatus> = {
    "2026-09-08": "working",
    "2026-09-18": "holiday",
    "2026-09-19": "holiday",
}

const mockAttendanceByDate: Record<string, string[]> = {
    "2026-09-08": ["Alejandro", "Rosa", "Carlos", "Pedro", "Carlos"],
}

const toDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

const sameDay = (left: Date, right: Date) => toDateKey(left) === toDateKey(right)

const buildMonthDays = (monthDate: Date): CalendarDay[] => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = (firstDay.getDay() + 6) % 7
    const days: CalendarDay[] = []

    for (let index = 0; index < startOffset; index += 1) {
        const date = new Date(year, month, 1 - startOffset + index)
        days.push({ date, isCurrentMonth: false })
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
        days.push({ date: new Date(year, month, day), isCurrentMonth: true })
    }

    while (days.length % 7 !== 0 || days.length < 35) {
        const lastDate = days[days.length - 1].date
        const date = new Date(lastDate)
        date.setDate(lastDate.getDate() + 1)
        days.push({ date, isCurrentMonth: false })
    }

    return days
}

export default function HumanResourcesOverview() {
    const today = useMemo(() => new Date(2026, 8, 8), [])
    const [monthDate, setMonthDate] = useState(() => new Date(2026, 8, 1))
    const [selectedDate, setSelectedDate] = useState(today)

    const monthDays = useMemo(() => buildMonthDays(monthDate), [monthDate])
    const selectedDateKey = toDateKey(selectedDate)
    const presentToday = mockAttendanceByDate[selectedDateKey] ?? []

    const handleMonthChange = (offset: number) => {
        setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
    }

    return (
        <section className="space-y-5">
            <div className="flex justify-end">
                <Button type="button" className="bg-slate-700 text-white hover:bg-slate-800">
                    <UserPlus className="h-4 w-4" />
                    Solicitar permiso
                </Button>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-4 grid grid-cols-[40px_1fr_40px] items-center gap-3">
                    <Button type="button" variant="outline" size="icon" onClick={() => handleMonthChange(-1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-center text-base font-bold capitalize text-slate-950 dark:text-white">
                        {monthFormatter.format(monthDate)}
                    </h2>
                    <Button type="button" variant="outline" size="icon" onClick={() => handleMonthChange(1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                    {weekdayLabels.map((day) => (
                        <div
                            key={day.full}
                            className={cn(
                                "space-y-3 py-2 text-xs font-bold text-slate-500",
                                day.full === "SAB" || day.full === "DOM" ? "text-rose-500" : "",
                            )}
                        >
                            <p>{day.short}</p>
                            <p>{day.full}</p>
                        </div>
                    ))}
                    {monthDays.map(({ date, isCurrentMonth }) => {
                        const dateKey = toDateKey(date)
                        const status = mockStatusByDate[dateKey]
                        const statusStyle = status ? statusStyles[status] : undefined
                        const isSelected = sameDay(date, selectedDate)
                        const isToday = sameDay(date, today)

                        return (
                            <button
                                key={dateKey}
                                type="button"
                                onClick={() => setSelectedDate(date)}
                                className={cn(
                                    "min-h-14 rounded-lg border border-transparent px-2 py-2 text-center text-sm font-bold transition-colors",
                                    isCurrentMonth
                                        ? "text-slate-950 hover:bg-slate-50 dark:text-white dark:hover:bg-slate-700"
                                        : "text-slate-300 dark:text-slate-600",
                                    statusStyle?.className,
                                    isSelected && "border-blue-600 ring-2 ring-blue-600",
                                )}
                            >
                                <span className="block">{date.getDate()}</span>
                                {status === "holiday" && (
                                    <span className="mt-1 block text-[9px] font-black uppercase text-red-600">
                                        Cerrado
                                    </span>
                                )}
                                {isToday && status !== "holiday" && (
                                    <span className="mt-1 block text-[9px] font-black uppercase text-emerald-700">
                                        Hoy
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                <div className="mt-8 flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-3">
                        {Object.entries(statusStyles).map(([status, style]) => (
                            <div key={status} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
                                <span className={cn("h-3 w-3 rounded-sm", style.color)} />
                                {style.label}
                            </div>
                        ))}
                    </div>
                    <Button type="button" variant="ghost" className="justify-start font-semibold text-slate-950 dark:text-white">
                        Enviar reporte de cierre de mes
                        <Send className="h-4 w-4" />
                    </Button>
                </div>

                <div className="pt-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold capitalize text-slate-950 dark:text-white">
                                {selectedDateFormatter.format(selectedDate)}
                            </h3>
                            {sameDay(selectedDate, today) && (
                                <span className="rounded-full bg-emerald-700 px-2 py-1 text-[10px] font-bold uppercase text-white">
                                    Hoy
                                </span>
                            )}
                        </div>
                        <button type="button" className="text-lg font-bold text-slate-400 hover:text-slate-600">
                            x
                        </button>
                    </div>

                    <div className="mt-4">
                        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-300">
                            <CalendarCheck className="h-4 w-4 text-emerald-500" />
                            Presentes hoy
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {presentToday.length > 0 ? (
                                presentToday.map((name, index) => (
                                    <span
                                        key={`${name}-${index}`}
                                        className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800"
                                    >
                                        {name}
                                    </span>
                                ))
                            ) : (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                                    Sin registros para este dia
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </section>
    )
}
