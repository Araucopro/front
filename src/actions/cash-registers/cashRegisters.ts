import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import type {
    CashRegisterStatus,
    ICashRegister,
    ICashClosing,
    ICashCount,
    ICreateCashMovement,
    ICashMovement,
    ICashSession,
    ICashSessionFilters,
    ICashSessionSummary,
    ICloseCashSession,
    ICreateCashRegister,
    IOpenCashSession,
    IStoreCashSummary,
    IUpdateCashRegister,
} from "@/interfaces/cash-registers/ICashRegister"

export async function getCashRegisters(filters: { storeID?: string; status?: CashRegisterStatus } = {}): Promise<ICashRegister[]> {
    const params = new URLSearchParams()
    if (filters.storeID) params.set("storeID", filters.storeID)
    if (filters.status) params.set("status", filters.status)
    const query = params.toString()
    const registers = await fetcher<ICashRegister[]>(`${API_URL}/cash-registers${query ? `?${query}` : ""}`)
    return Array.isArray(registers) ? registers : []
}

export async function getCashRegister(cashRegisterID: string): Promise<ICashRegister> {
    return fetcher<ICashRegister>(`${API_URL}/cash-registers/${cashRegisterID}`)
}

export async function createCashRegister(payload: ICreateCashRegister): Promise<ICashRegister> {
    return fetcher<ICashRegister>(`${API_URL}/cash-registers`, {
        method: "POST",
        body: JSON.stringify(payload),
    })
}

export async function updateCashRegister(cashRegisterID: string, payload: IUpdateCashRegister): Promise<ICashRegister> {
    return fetcher<ICashRegister>(`${API_URL}/cash-registers/${cashRegisterID}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    })
}

export async function openCashSession(cashRegisterID: string, payload: IOpenCashSession): Promise<ICashSession> {
    return fetcher<ICashSession>(`${API_URL}/cash-registers/${cashRegisterID}/sessions/open`, {
        method: "POST",
        body: JSON.stringify(payload),
    })
}

export async function getActiveCashSession(cashRegisterID: string): Promise<ICashSession | null> {
    try {
        return await fetcher<ICashSession>(`${API_URL}/cash-registers/${cashRegisterID}/sessions/active`)
    } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : ""
        if (message.includes("404") || message.includes("no hay sesi") || message.includes("not found")) return null
        throw error
    }
}

export async function closeCashSession(cashRegisterID: string, payload: ICloseCashSession): Promise<ICashSession> {
    return fetcher<ICashSession>(`${API_URL}/cash-registers/${cashRegisterID}/sessions/close`, {
        method: "POST",
        body: JSON.stringify(payload),
    })
}

export async function getCashSessions(cashRegisterID: string, filters: ICashSessionFilters = {}): Promise<ICashSession[]> {
    const params = new URLSearchParams()
    if (filters.status) params.set("status", filters.status)
    if (filters.fromBusinessDate) params.set("fromBusinessDate", filters.fromBusinessDate)
    if (filters.toBusinessDate) params.set("toBusinessDate", filters.toBusinessDate)
    const query = params.toString()
    const sessions = await fetcher<ICashSession[]>(
        `${API_URL}/cash-registers/${cashRegisterID}/sessions${query ? `?${query}` : ""}`,
    )
    return Array.isArray(sessions) ? sessions : []
}

export async function getCashSessionSummary(cashRegisterID: string, sessionID: string): Promise<ICashSessionSummary> {
    return fetcher<ICashSessionSummary>(
        `${API_URL}/cash-registers/${cashRegisterID}/sessions/${sessionID}/summary`,
    )
}

export async function getStoreCashSummary(storeID: string, from?: string, to?: string): Promise<IStoreCashSummary> {
    const params = new URLSearchParams()
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    const query = params.toString()
    return fetcher<IStoreCashSummary>(`${API_URL}/stores/${storeID}/cash-summary${query ? `?${query}` : ""}`)
}

export function createCashMovement(cashRegisterID: string, sessionID: string, payload: ICreateCashMovement): Promise<ICashMovement> {
    return fetcher<ICashMovement>(`${API_URL}/cash-registers/${cashRegisterID}/sessions/${sessionID}/movements`, {
        method: "POST",
        body: JSON.stringify(payload),
    })
}

export async function getCashMovements(cashRegisterID: string, sessionID: string): Promise<ICashMovement[]> {
    const response = await fetcher<ICashMovement[]>(`${API_URL}/cash-registers/${cashRegisterID}/sessions/${sessionID}/movements`)
    return Array.isArray(response) ? response : []
}

export function startCashClosing(cashRegisterID: string, sessionID: string, notes?: string): Promise<ICashClosing> {
    return fetcher<ICashClosing>(`${API_URL}/cash-registers/${cashRegisterID}/sessions/${sessionID}/closing/start`, {
        method: "POST",
        body: JSON.stringify(notes ? { notes } : {}),
    })
}

export async function getCurrentCashClosing(cashRegisterID: string, sessionID: string): Promise<ICashClosing | null> {
    try {
        return await fetcher<ICashClosing>(`${API_URL}/cash-registers/${cashRegisterID}/sessions/${sessionID}/closing`)
    } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : ""
        if (message.includes("404") || message.includes("no tiene") || message.includes("not found")) return null
        throw error
    }
}

export function startCashCount(cashRegisterID: string, sessionID: string, notes?: string): Promise<ICashCount> {
    return fetcher<ICashCount>(`${API_URL}/cash-registers/${cashRegisterID}/sessions/${sessionID}/counts`, {
        method: "POST",
        body: JSON.stringify(notes ? { notes } : {}),
    })
}

export async function getCurrentCashCount(cashRegisterID: string, sessionID: string): Promise<ICashCount | null> {
    try {
        return await fetcher<ICashCount>(`${API_URL}/cash-registers/${cashRegisterID}/sessions/${sessionID}/counts/current`)
    } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : ""
        if (message.includes("404") || message.includes("no tiene") || message.includes("not found")) return null
        throw error
    }
}

export function updateCashCountItems(cashRegisterID: string, sessionID: string, items: Array<{ denominationID: string; quantity: number }>): Promise<ICashCount> {
    return fetcher<ICashCount>(`${API_URL}/cash-registers/${cashRegisterID}/sessions/${sessionID}/counts/current/items`, {
        method: "PUT",
        body: JSON.stringify({ items }),
    })
}

export function completeCashCount(cashRegisterID: string, sessionID: string, notes?: string): Promise<ICashCount> {
    return fetcher<ICashCount>(`${API_URL}/cash-registers/${cashRegisterID}/sessions/${sessionID}/counts/current/complete`, {
        method: "POST",
        body: JSON.stringify(notes ? { notes } : {}),
    })
}

export function completeCashClosing(cashRegisterID: string, sessionID: string, notes?: string): Promise<ICashClosing> {
    return fetcher<ICashClosing>(`${API_URL}/cash-registers/${cashRegisterID}/sessions/${sessionID}/closing/complete`, {
        method: "POST",
        body: JSON.stringify(notes ? { notes } : {}),
    })
}
