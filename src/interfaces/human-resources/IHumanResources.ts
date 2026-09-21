export type AttendanceOverrideType =
    | "VACATION"
    | "MEDICAL_LEAVE"
    | "PERMIT"
    | "JUSTIFIED_ABSENCE"
    | "UNJUSTIFIED_ABSENCE"
    | "PRESENT_ON_CLOSED_DAY"

export type AttendanceStatus = "PRESENT" | "CLOSED" | AttendanceOverrideType

export interface IHrEmployee {
    employeeID: string
    name: string
    role: string
    effectiveFrom: string
    effectiveTo: string | null
}

export interface ICalendarEmployee {
    employeeID: string
    name: string
    role: string
    status: AttendanceStatus
    reason: string | null
    overrideID: string | null
}

export interface IAttendanceCalendarDay {
    date: string
    storeStatus: "OPEN" | "CLOSED"
    employeeCount: number
    presentCount: number
    absentCount: number
    employees: ICalendarEmployee[]
}

export interface IAttendanceCalendar {
    storeID: string
    from: string
    to: string
    days: IAttendanceCalendarDay[]
}

export interface IAttendanceSummaryEmployee {
    employeeID: string
    name: string
    role: string
    presentCount: number
    absentCount: number
    closedDays: number
}

export interface IAttendanceSummary {
    storeID: string
    from: string
    to: string
    presentCount: number
    absentCount: number
    employeeDays: number
    closedDays: number
    employees: IAttendanceSummaryEmployee[]
}

export interface IAttendanceOverride {
    id: string
    startDate: string
    endDate: string
    type: AttendanceOverrideType
    reason: string
    employeeID: string
    storeID: string
    createdAt: string
    updatedAt: string
}

export interface ICreateAttendanceOverride {
    employeeID: string
    startDate: string
    endDate: string
    type: AttendanceOverrideType
    reason: string
}

export type IUpdateAttendanceOverride = Partial<Omit<ICreateAttendanceOverride, "employeeID">>

export interface IStoreClosure {
    id: string
    startDate: string
    endDate: string
    reason: string
    createdBy: string
    cancelledAt: string | null
    cancelledBy: string | null
    cancellationReason: string | null
    storeID: string
    createdAt: string
    updatedAt: string
}

export interface ICreateStoreClosure {
    startDate: string
    endDate: string
    reason: string
}

export interface ICreateStoreClosuresBulk {
    dates?: string[]
    from?: string
    to?: string
    weekdays?: number[]
    reason: string
}

export interface IAttendanceAuditEvent {
    id: string
    overrideID: string
    employeeID: string
    storeID: string
    action: "CREATED" | "UPDATED" | "DELETED"
    affectedStartDate: string
    affectedEndDate: string
    previousType: AttendanceOverrideType | null
    newType: AttendanceOverrideType | null
    previousReason: string | null
    newReason: string | null
    performedByUserID: string | null
    performedByMasterUserID: string | null
    performedAt: string
    tenantID: string
}

export interface IAttendanceAuditFilters {
    employeeID?: string
    from?: string
    to?: string
    limit?: number
    offset?: number
}
