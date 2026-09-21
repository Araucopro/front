"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
    getAttendanceCalendar,
    getAttendanceSummary,
    getHrEmployees,
    getStoreClosures,
} from "@/actions/human-resources/attendance"
import AttendanceOverrideDialog from "@/components/RecursosHumanos/AttendanceOverrideDialog"
import StoreClosureDialog from "@/components/RecursosHumanos/StoreClosureDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type {
    AttendanceStatus,
    IAttendanceCalendar,
    IAttendanceCalendarDay,
    IAttendanceSummary,
    ICalendarEmployee,
    IStoreClosure,
} from "@/interfaces/human-resources/IHumanResources"
import { cn } from "@/lib/utils"
import { useTienda } from "@/stores/tienda.store"
import {
    CalendarCheck,
    ChevronLeft,
    ChevronRight,
    DoorClosed,
    RefreshCw,
    Send,
    TriangleAlert,
    UserCheck,
    UserMinus,
    UserX,
} from "lucide-react"
import { toast } from "sonner"

type CalendarDay = { date: Date; isCurrentMonth: boolean }

const weekdayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

const statusConfig: Record<AttendanceStatus, { label: string; className: string; dot: string }> = {
    PRESENT: { label: "Presente", className: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
    CLOSED: { label: "Día cerrado", className: "bg-red-50 text-red-800", dot: "bg-red-500" },
    VACATION: { label: "Vacaciones", className: "bg-sky-50 text-sky-800", dot: "bg-sky-500" },
    MEDICAL_LEAVE: { label: "Licencia médica", className: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
    PERMIT: { label: "Permiso", className: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
    JUSTIFIED_ABSENCE: { label: "Ausencia justificada", className: "bg-orange-50 text-orange-800", dot: "bg-orange-500" },
    UNJUSTIFIED_ABSENCE: { label: "Ausencia injustificada", className: "bg-red-50 text-red-800", dot: "bg-red-600" },
    PRESENT_ON_CLOSED_DAY: { label: "Presente en día cerrado", className: "bg-violet-50 text-violet-800", dot: "bg-violet-500" },
}

const legendStatuses: AttendanceStatus[] = ["PRESENT", "VACATION", "MEDICAL_LEAVE", "PERMIT", "JUSTIFIED_ABSENCE"]

const monthFormatter = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" })
const selectedDateFormatter = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
})

const toDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

const toMonthKey = (date: Date) => toDateKey(date).slice(0, 7)
const sameDay = (left: Date, right: Date) => toDateKey(left) === toDateKey(right)
const fromDateKey = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number)
    return new Date(year, month - 1, day, 12)
}

const buildMonthDays = (monthDate: Date): CalendarDay[] => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const firstDay = new Date(year, month, 1, 12)
    const lastDay = new Date(year, month + 1, 0, 12)
    const startOffset = (firstDay.getDay() + 6) % 7
    const days: CalendarDay[] = []

    for (let index = 0; index < startOffset; index += 1) {
        days.push({ date: new Date(year, month, 1 - startOffset + index, 12), isCurrentMonth: false })
    }
    for (let day = 1; day <= lastDay.getDate(); day += 1) {
        days.push({ date: new Date(year, month, day, 12), isCurrentMonth: true })
    }
    while (days.length % 7 !== 0 || days.length < 35) {
        const last = days[days.length - 1].date
        days.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1, 12), isCurrentMonth: false })
    }
    return days
}

const getDayClassName = (day?: IAttendanceCalendarDay, isFuture = false) => {
    if (!day) return ""
    if (day.storeStatus === "CLOSED") return "border-red-300 bg-red-50 text-red-800"
    if (day.employeeCount === 0) return "border-slate-200 bg-slate-50 text-slate-500"
    if (isFuture && day.absentCount === 0) return "border-slate-200 bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200"
    if (day.absentCount === 0) return "border-emerald-200 bg-emerald-50 text-emerald-800"
    const employees = Array.isArray(day.employees) ? day.employees : []
    if (employees.some((employee) => employee.status === "MEDICAL_LEAVE")) return "border-rose-200 bg-rose-50 text-rose-800"
    if (employees.some((employee) => employee.status === "VACATION")) return "border-sky-200 bg-sky-50 text-sky-800"
    if (employees.some((employee) => employee.status === "PERMIT")) return "border-amber-200 bg-amber-50 text-amber-800"
    return "border-orange-200 bg-orange-50 text-orange-800"
}

const getDayTooltip = (day?: IAttendanceCalendarDay, isFuture = false) => {
    if (!day) return "Sin información de asistencia"
    if (day.storeStatus === "CLOSED") return "Día cerrado"

    const employees = Array.isArray(day.employees) ? day.employees : []
    const absent = employees.filter(
        (employee) => employee.status !== "PRESENT" && employee.status !== "PRESENT_ON_CLOSED_DAY" && employee.status !== "CLOSED",
    )
    const present = employees.filter(
        (employee) => employee.status === "PRESENT" || employee.status === "PRESENT_ON_CLOSED_DAY",
    )

    if (isFuture && absent.length > 0) return `Ausencias programadas: ${absent.map((employee) => employee.name).join(", ")}`
    if (isFuture) return "Sin ausencias programadas. Haz clic para registrar una"
    if (absent.length > 0 && present.length > 0) return `Presentes todos excepto ${absent.map((employee) => employee.name).join(", ")}`
    if (absent.length > 0) return `Ausentes: ${absent.map((employee) => employee.name).join(", ")}`
    if (present.length > 0) return `Presentes: ${present.map((employee) => employee.name).join(", ")}`
    if (day.presentCount > 0) return `${day.presentCount} trabajadores presentes`
    return "Sin trabajadores asignados"
}

export default function HumanResourcesOverview() {
    const searchParams = useSearchParams()
    const storeSelected = useTienda((state) => state.storeSelected)
    const storeID = searchParams.get("storeID") || storeSelected?.storeID || ""
    const today = useMemo(() => new Date(), [])
    const todayKey = toDateKey(today)
    const todayMonthKey = toMonthKey(today)
    const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1, 12))
    const [selectedDate, setSelectedDate] = useState(today)
    const [calendar, setCalendar] = useState<IAttendanceCalendar | null>(null)
    const [summary, setSummary] = useState<IAttendanceSummary | null>(null)
    const [closures, setClosures] = useState<IStoreClosure[]>([])
    const [selectedRoster, setSelectedRoster] = useState<ICalendarEmployee[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [selectedEmployee, setSelectedEmployee] = useState<ICalendarEmployee | null>(null)
    const [isAttendanceOpen, setIsAttendanceOpen] = useState(false)
    const [isClosureOpen, setIsClosureOpen] = useState(false)

    const monthKey = toMonthKey(monthDate)
    const monthDays = useMemo(() => buildMonthDays(monthDate), [monthDate])
    const selectedDateKey = toDateKey(selectedDate)
    const calendarDays = useMemo(
        () => Array.isArray(calendar?.days) ? calendar.days : [],
        [calendar],
    )
    const daysByDate = useMemo(
        () => new Map(calendarDays.filter((day) => day?.date).map((day) => [day.date.slice(0, 10), day])),
        [calendarDays],
    )
    const calendarSelectedDay = daysByDate.get(selectedDateKey)
    const firstDayWithEmployees = calendarDays.find((day) => Array.isArray(day.employees) && day.employees.length > 0)
    const selectedClosure = useMemo(
        () => closures.find(
            (closure) => closure.startDate.slice(0, 10) <= selectedDateKey && closure.endDate.slice(0, 10) >= selectedDateKey,
        ) ?? null,
        [closures, selectedDateKey],
    )
    const selectedDay = useMemo<IAttendanceCalendarDay | undefined>(() => {
        const calendarEmployees = Array.isArray(calendarSelectedDay?.employees) ? calendarSelectedDay.employees : []
        const calendarEmployeesByID = new Map(calendarEmployees.map((employee) => [employee.employeeID, employee]))
        const rosterEmployees = selectedRoster.map((employee) => calendarEmployeesByID.get(employee.employeeID) ?? employee)
        const rosterIDs = new Set(rosterEmployees.map((employee) => employee.employeeID))
        const employees = [...rosterEmployees, ...calendarEmployees.filter((employee) => !rosterIDs.has(employee.employeeID))]

        if (!calendarSelectedDay && employees.length === 0) return undefined

        const storeStatus = calendarSelectedDay?.storeStatus ?? (selectedClosure ? "CLOSED" : "OPEN")
        const presentCount = employees.filter(
            (employee) => employee.status === "PRESENT" || employee.status === "PRESENT_ON_CLOSED_DAY",
        ).length
        const absentCount = employees.filter(
            (employee) => employee.status !== "PRESENT" && employee.status !== "PRESENT_ON_CLOSED_DAY" && employee.status !== "CLOSED",
        ).length

        return {
            date: selectedDateKey,
            storeStatus,
            employeeCount: employees.length,
            presentCount,
            absentCount,
            employees,
        }
    }, [calendarSelectedDay, selectedClosure, selectedDateKey, selectedRoster])

    const loadMonth = useCallback(async () => {
        if (!storeID) {
            setCalendar(null)
            setSummary(null)
            setClosures([])
            setLoadError(null)
            return
        }

        const from = `${monthKey}-01`
        const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 12).getDate()
        const to = `${monthKey}-${String(lastDay).padStart(2, "0")}`
        setIsLoading(true)
        setLoadError(null)
        try {
            const summaryTo = monthKey < todayMonthKey ? to : monthKey === todayMonthKey ? todayKey : null
            const emptySummary: IAttendanceSummary = {
                storeID,
                from,
                to,
                presentCount: 0,
                absentCount: 0,
                employeeDays: 0,
                closedDays: 0,
                employees: [],
            }
            const [calendarResponse, summaryResponse, closuresResponse] = await Promise.all([
                getAttendanceCalendar(storeID, monthKey),
                summaryTo ? getAttendanceSummary(storeID, from, summaryTo) : Promise.resolve(emptySummary),
                getStoreClosures(storeID, from, to).catch(() => []),
            ])
            setCalendar(calendarResponse)
            setSummary(summaryResponse)
            setClosures(closuresResponse)
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudo cargar la asistencia"
            setLoadError(message)
            toast.error(message)
        } finally {
            setIsLoading(false)
        }
    }, [monthDate, monthKey, storeID, todayKey, todayMonthKey])

    useEffect(() => {
        void loadMonth()
    }, [loadMonth])

    useEffect(() => {
        let cancelled = false

        if (!storeID) {
            setSelectedRoster([])
            return
        }

        setSelectedRoster([])
        void getHrEmployees(storeID, selectedDateKey)
            .then((employees) => {
                if (cancelled) return
                setSelectedRoster(employees.map((employee) => ({
                    employeeID: employee.employeeID,
                    name: employee.name,
                    role: employee.role,
                    status: "PRESENT",
                    reason: null,
                    overrideID: null,
                })))
            })
            .catch(() => {
                if (!cancelled) setSelectedRoster([])
            })

        return () => {
            cancelled = true
        }
    }, [selectedDateKey, storeID])

    const handleMonthChange = (offset: number) => {
        const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1, 12)
        setMonthDate(nextMonth)
        setSelectedDate(nextMonth)
    }

    const handleSelectDate = (date: Date, isCurrentMonth: boolean) => {
        setSelectedDate(date)
        if (!isCurrentMonth) setMonthDate(new Date(date.getFullYear(), date.getMonth(), 1, 12))
    }

    const handleEditEmployee = (employee: ICalendarEmployee) => {
        setSelectedEmployee(employee)
        setIsAttendanceOpen(true)
    }

    const presentEmployees = selectedDay?.employees.filter(
        (employee) => employee.status === "PRESENT" || employee.status === "PRESENT_ON_CLOSED_DAY",
    ) ?? []
    const absentEmployees = selectedDay?.employees.filter(
        (employee) => employee.status !== "PRESENT" && employee.status !== "PRESENT_ON_CLOSED_DAY" && employee.status !== "CLOSED",
    ) ?? []
    const closedDayEmployees = selectedDay?.employees.filter((employee) => employee.status === "CLOSED") ?? []
    const employeesAvailableForOverride = selectedDay?.employees.filter((employee) => !employee.overrideID) ?? []
    const countedAttendanceDays = (summary?.presentCount ?? 0) + (summary?.absentCount ?? 0)
    const attendanceRate = countedAttendanceDays
        ? Math.round(((summary?.presentCount ?? 0) / countedAttendanceDays) * 100)
        : 0

    return (
        <section className="space-y-5">
            {!storeID && (
                <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    Selecciona una tienda para consultar y registrar la asistencia.
                </div>
            )}

            {loadError && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <span>{loadError}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => void loadMonth()}>
                        <RefreshCw className="h-4 w-4" /> Reintentar
                    </Button>
                </div>
            )}

            <div className="flex justify-end">
                <Button
                    type="button"
                    className="bg-slate-700 text-white hover:bg-slate-800"
                    disabled={!storeID || employeesAvailableForOverride.length === 0}
                    title={employeesAvailableForOverride.length === 0 ? "Selecciona una fecha con trabajadores asignados" : undefined}
                    onClick={() => {
                        setSelectedEmployee(null)
                        setIsAttendanceOpen(true)
                    }}
                >
                    <UserMinus className="h-4 w-4" /> Registrar falta o ausencia
                </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard label="Días-persona presentes" value={summary?.presentCount ?? 0} icon={UserCheck} tone="emerald" />
                <SummaryCard label="Días-persona ausentes" value={summary?.absentCount ?? 0} icon={UserX} tone="rose" />
                <SummaryCard label="Asistencia del mes" value={`${attendanceRate}%`} icon={CalendarCheck} tone="sky" />
                <SummaryCard label="Días cerrados" value={summary?.closedDays ?? 0} icon={DoorClosed} tone="violet" />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-4 grid grid-cols-[40px_1fr_40px] items-center gap-3">
                    <Button type="button" variant="outline" size="icon" onClick={() => handleMonthChange(-1)} disabled={isLoading}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-center">
                        <h2 className="text-base font-bold capitalize text-slate-950 dark:text-white">{monthFormatter.format(monthDate)}</h2>
                        <p className="text-xs text-slate-500">{isLoading ? "Cargando asistencia..." : storeSelected?.name ?? "Tienda seleccionada"}</p>
                    </div>
                    <Button type="button" variant="outline" size="icon" onClick={() => handleMonthChange(1)} disabled={isLoading}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <TooltipProvider delayDuration={200}>
                    <div className="grid grid-cols-7 gap-1 text-center">
                        {weekdayLabels.map((day, index) => (
                            <div key={day} className={cn("py-2 text-xs font-bold uppercase text-slate-500", index > 4 && "text-rose-500")}>{day}</div>
                        ))}
                        {monthDays.map(({ date, isCurrentMonth }) => {
                            const dateKey = toDateKey(date)
                            const day = dateKey === selectedDateKey ? selectedDay ?? daysByDate.get(dateKey) : daysByDate.get(dateKey)
                            const isSelected = sameDay(date, selectedDate)
                            const isToday = sameDay(date, today)
                            const isFuture = dateKey > todayKey
                            return (
                                <Tooltip key={dateKey}>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectDate(date, isCurrentMonth)}
                                            className={cn(
                                                "min-h-16 rounded-lg border border-transparent px-1 py-2 text-center text-sm font-bold transition-colors",
                                                isCurrentMonth ? "text-slate-950 hover:brightness-95 dark:text-white" : "text-slate-300 dark:text-slate-600",
                                                isCurrentMonth && getDayClassName(day, isFuture),
                                                isSelected && "border-blue-600 ring-2 ring-blue-600",
                                            )}
                                        >
                                            <span className="block">{date.getDate()}</span>
                                            {day?.storeStatus === "CLOSED" && (
                                                <span className="mt-1 block text-[9px] font-black uppercase text-red-700">Día cerrado</span>
                                            )}
                                            {isToday && <span className="mt-0.5 block text-[8px] font-black uppercase">Hoy</span>}
                                        </button>
                                    </TooltipTrigger>
                                    {isCurrentMonth && (
                                        <TooltipContent side="top" className="max-w-72 bg-slate-900 text-white">
                                            {getDayTooltip(day, isFuture)}
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            )
                        })}
                    </div>
                </TooltipProvider>

                <div className="mt-7 flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-3">
                        {legendStatuses.map((status) => (
                            <div key={status} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
                                <span className={cn("h-3 w-3 rounded-sm", statusConfig[status].dot)} />
                                {statusConfig[status].label}
                            </div>
                        ))}
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
                            <span className="h-3 w-3 rounded-sm bg-red-500" /> Día cerrado
                        </div>
                    </div>
                    <Button type="button" variant="ghost" disabled title="En desarrollo" className="justify-start">
                        <Send className="h-4 w-4" /> Enviar reporte
                        <Badge variant="outline" className="ml-1">En desarrollo</Badge>
                    </Button>
                </div>

                <div className="pt-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold capitalize text-slate-950 dark:text-white">{selectedDateFormatter.format(selectedDate)}</h3>
                                {sameDay(selectedDate, today) && <Badge className="bg-emerald-700 text-white">Hoy</Badge>}
                                {selectedDay?.storeStatus === "CLOSED" && <Badge className="bg-red-100 text-red-800">Día cerrado</Badge>}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                {selectedDay
                                    ? selectedDateKey > todayKey
                                        ? `${selectedDay.employeeCount} trabajadores · ${selectedDay.absentCount} ausencias programadas`
                                        : `${selectedDay.presentCount} presentes · ${selectedDay.absentCount} ausentes`
                                    : "Sin roster disponible para esta fecha"}
                            </p>
                        </div>
                        {selectedDay && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsClosureOpen(true)}
                                disabled={selectedDay.storeStatus === "CLOSED" && !selectedClosure}
                                title={selectedDay.storeStatus === "CLOSED" && !selectedClosure ? "No se pudo identificar el cierre activo" : undefined}
                            >
                                <DoorClosed className="h-4 w-4" />
                                {selectedDay.storeStatus === "CLOSED" ? "Reabrir tienda" : "Cerrar tienda este día"}
                            </Button>
                        )}
                    </div>

                    {selectedDay?.employees.length ? (
                        <div className="mt-5 space-y-5">
                            <EmployeeGroup
                                title={selectedDateKey > todayKey ? "Trabajadores" : "Presentes"}
                                icon={UserCheck}
                                employees={presentEmployees}
                                onEdit={handleEditEmployee}
                            />
                            {absentEmployees.length > 0 && (
                                <EmployeeGroup
                                    title={selectedDateKey > todayKey ? "Ausencias programadas" : "Ausentes"}
                                    icon={UserX}
                                    employees={absentEmployees}
                                    onEdit={handleEditEmployee}
                                />
                            )}
                            {closedDayEmployees.length > 0 && (
                                <EmployeeGroup title="Sin jornada por cierre" icon={DoorClosed} employees={closedDayEmployees} onEdit={handleEditEmployee} />
                            )}
                        </div>
                    ) : (
                        <div className="mt-5 flex flex-col gap-3 rounded-lg border border-dashed border-slate-200 p-5 text-sm text-slate-500 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                            <span>{storeID ? "No hay trabajadores asignados a la tienda en esta fecha." : "Selecciona una tienda para ver el roster."}</span>
                            {firstDayWithEmployees && (
                                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDate(fromDateKey(firstDayWithEmployees.date))}>
                                    Ir a una fecha con trabajadores
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {storeID && (selectedEmployee || employeesAvailableForOverride.length > 0) && (
                <AttendanceOverrideDialog
                    open={isAttendanceOpen}
                    onOpenChange={setIsAttendanceOpen}
                    storeID={storeID}
                    employee={selectedEmployee}
                    employees={employeesAvailableForOverride}
                    date={selectedDateKey}
                    storeIsClosed={selectedDay?.storeStatus === "CLOSED"}
                    onSaved={loadMonth}
                />
            )}
            {storeID && (
                <StoreClosureDialog
                    open={isClosureOpen}
                    onOpenChange={setIsClosureOpen}
                    storeID={storeID}
                    date={selectedDateKey}
                    closure={selectedClosure}
                    onSaved={loadMonth}
                />
            )}
        </section>
    )
}

function EmployeeGroup({
    title,
    icon: Icon,
    employees,
    onEdit,
}: {
    title: string
    icon: typeof UserCheck
    employees: ICalendarEmployee[]
    onEdit: (employee: ICalendarEmployee) => void
}) {
    const presentChipStyles = [
        "bg-sky-50 text-sky-800 hover:bg-sky-100",
        "bg-cyan-50 text-cyan-800 hover:bg-cyan-100",
        "bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
        "bg-teal-50 text-teal-800 hover:bg-teal-100",
    ]

    return (
        <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-300">
                <Icon className="h-4 w-4" /> {title} <span>({employees.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {employees.length ? employees.map((employee, index) => {
                    const config = statusConfig[employee.status] ?? statusConfig.PRESENT
                    const isPresent = employee.status === "PRESENT" || employee.status === "PRESENT_ON_CLOSED_DAY"
                    return (
                        <button
                            key={employee.employeeID}
                            type="button"
                            onClick={() => onEdit(employee)}
                            title={employee.overrideID ? `Editar ${config.label.toLowerCase()}${employee.reason ? `: ${employee.reason}` : ""}` : `Marcar ausencia de ${employee.name}`}
                            className={cn(
                                "rounded-full px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
                                isPresent ? presentChipStyles[index % presentChipStyles.length] : config.className,
                            )}
                        >
                            {employee.name}
                        </button>
                    )
                }) : (
                    <p className="text-sm text-slate-500">Sin trabajadores en este estado.</p>
                )}
            </div>
        </div>
    )
}

function SummaryCard({
    label,
    value,
    icon: Icon,
    tone,
}: {
    label: string
    value: number | string
    icon: typeof CalendarCheck
    tone: "emerald" | "rose" | "sky" | "violet"
}) {
    const colors = {
        emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
        rose: "border-rose-200 bg-rose-50 text-rose-800",
        sky: "border-sky-200 bg-sky-50 text-sky-800",
        violet: "border-violet-200 bg-violet-50 text-violet-800",
    }
    return (
        <div className={cn("flex items-center gap-3 rounded-lg border p-4", colors[tone])}>
            <Icon className="h-5 w-5 shrink-0" />
            <div>
                <p className="text-2xl font-black">{value}</p>
                <p className="text-xs font-semibold">{label}</p>
            </div>
        </div>
    )
}
