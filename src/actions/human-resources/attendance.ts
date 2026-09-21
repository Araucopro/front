import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import type {
    IAttendanceAuditEvent,
    IAttendanceAuditFilters,
    IAttendanceCalendar,
    IAttendanceCalendarDay,
    IAttendanceOverride,
    IAttendanceSummary,
    ICreateAttendanceOverride,
    ICreateStoreClosure,
    ICreateStoreClosuresBulk,
    IHrEmployee,
    IStoreClosure,
    IUpdateAttendanceOverride,
} from "@/interfaces/human-resources/IHumanResources"

const storeHeaders = (storeID: string): HeadersInit => ({ "X-Store-ID": storeID })

export async function getHrEmployees(storeID: string, date?: string): Promise<IHrEmployee[]> {
    const params = new URLSearchParams()
    if (date) params.set("date", date)
    const query = params.toString()
    const employees = await fetcher<IHrEmployee[]>(`${API_URL}/hr/employees${query ? `?${query}` : ""}`, {
        headers: storeHeaders(storeID),
    })
    return Array.isArray(employees) ? employees : []
}

export async function getAttendanceCalendar(storeID: string, month: string): Promise<IAttendanceCalendar> {
    const params = new URLSearchParams({ month })
    type CalendarApiResponse = Partial<IAttendanceCalendar> & { calendar?: IAttendanceCalendarDay[] }
    const response = await fetcher<IAttendanceCalendarDay[] | CalendarApiResponse>(`${API_URL}/hr/calendar?${params.toString()}`, {
        headers: storeHeaders(storeID),
    })

    const [year, monthNumber] = month.split("-").map(Number)
    const lastDay = new Date(year, monthNumber, 0).getDate()
    const fallbackFrom = `${month}-01`
    const fallbackTo = `${month}-${String(lastDay).padStart(2, "0")}`

    if (Array.isArray(response)) {
        return { storeID, from: fallbackFrom, to: fallbackTo, days: response }
    }

    const days = Array.isArray(response.days)
        ? response.days
        : Array.isArray(response.calendar)
          ? response.calendar
          : []

    return {
        storeID: response.storeID ?? storeID,
        from: response.from ?? fallbackFrom,
        to: response.to ?? fallbackTo,
        days,
    }
}

export async function getAttendanceSummary(storeID: string, from: string, to: string): Promise<IAttendanceSummary> {
    const params = new URLSearchParams({ from, to })
    return fetcher<IAttendanceSummary>(`${API_URL}/hr/attendance-summary?${params.toString()}`, {
        headers: storeHeaders(storeID),
    })
}

export async function createAttendanceOverride(
    storeID: string,
    payload: ICreateAttendanceOverride,
): Promise<IAttendanceOverride> {
    return fetcher<IAttendanceOverride>(`${API_URL}/hr/attendance-overrides`, {
        method: "POST",
        headers: storeHeaders(storeID),
        body: JSON.stringify(payload),
    })
}

export async function updateAttendanceOverride(
    storeID: string,
    overrideID: string,
    payload: IUpdateAttendanceOverride,
): Promise<IAttendanceOverride> {
    return fetcher<IAttendanceOverride>(`${API_URL}/hr/attendance-overrides/${overrideID}`, {
        method: "PATCH",
        headers: storeHeaders(storeID),
        body: JSON.stringify(payload),
    })
}

export async function deleteAttendanceOverride(storeID: string, overrideID: string): Promise<void> {
    return fetcher<void>(`${API_URL}/hr/attendance-overrides/${overrideID}`, {
        method: "DELETE",
        headers: storeHeaders(storeID),
    })
}

export async function getStoreClosures(storeID: string, from?: string, to?: string): Promise<IStoreClosure[]> {
    const params = new URLSearchParams()
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    const query = params.toString()
    const closures = await fetcher<IStoreClosure[]>(`${API_URL}/hr/store-closures${query ? `?${query}` : ""}`, {
        headers: storeHeaders(storeID),
    })
    return Array.isArray(closures) ? closures : []
}

export async function createStoreClosure(storeID: string, payload: ICreateStoreClosure): Promise<IStoreClosure> {
    return fetcher<IStoreClosure>(`${API_URL}/hr/store-closures`, {
        method: "POST",
        headers: storeHeaders(storeID),
        body: JSON.stringify(payload),
    })
}

export async function createStoreClosuresBulk(
    storeID: string,
    payload: ICreateStoreClosuresBulk,
): Promise<IStoreClosure[]> {
    return fetcher<IStoreClosure[]>(`${API_URL}/hr/store-closures/bulk`, {
        method: "POST",
        headers: storeHeaders(storeID),
        body: JSON.stringify(payload),
    })
}

export async function cancelStoreClosure(storeID: string, closureID: string, reason?: string): Promise<void> {
    return fetcher<void>(`${API_URL}/hr/store-closures/${closureID}`, {
        method: "DELETE",
        headers: storeHeaders(storeID),
        ...(reason ? { body: JSON.stringify({ reason }) } : {}),
    })
}

export async function getAttendanceAuditLog(
    storeID: string,
    filters: IAttendanceAuditFilters = {},
): Promise<IAttendanceAuditEvent[]> {
    const params = new URLSearchParams()
    if (filters.employeeID) params.set("employeeID", filters.employeeID)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)
    if (filters.limit !== undefined) params.set("limit", String(filters.limit))
    if (filters.offset !== undefined) params.set("offset", String(filters.offset))
    const query = params.toString()
    const events = await fetcher<IAttendanceAuditEvent[]>(
        `${API_URL}/hr/attendance-audit-log${query ? `?${query}` : ""}`,
        { headers: storeHeaders(storeID) },
    )
    return Array.isArray(events) ? events : []
}
