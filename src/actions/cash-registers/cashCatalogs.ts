import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import type {
    CashDenominationType,
    CashMovementType,
    ICreateCashDenomination,
    ICreateCashMovementReason,
    ICreatePaymentMethod,
    ICashDenomination,
    ICashMovementReason,
    IPaymentMethod,
    IUpdateCashDenomination,
    IUpdateCashMovementReason,
    IUpdatePaymentMethod,
    PaymentMethodType,
} from "@/interfaces/cash-registers/ICashCatalogs"

export async function getPaymentMethods(filters: { active?: boolean; type?: PaymentMethodType } = {}): Promise<IPaymentMethod[]> {
    const params = new URLSearchParams()
    if (filters.active !== undefined) params.set("active", String(filters.active))
    if (filters.type) params.set("type", filters.type)
    const query = params.toString()
    const response = await fetcher<IPaymentMethod[]>(`${API_URL}/payment-methods${query ? `?${query}` : ""}`)
    return Array.isArray(response) ? response : []
}

export function createPaymentMethod(payload: ICreatePaymentMethod): Promise<IPaymentMethod> {
    return fetcher<IPaymentMethod>(`${API_URL}/payment-methods`, { method: "POST", body: JSON.stringify(payload) })
}

export function updatePaymentMethod(id: string, payload: IUpdatePaymentMethod): Promise<IPaymentMethod> {
    return fetcher<IPaymentMethod>(`${API_URL}/payment-methods/${id}`, { method: "PATCH", body: JSON.stringify(payload) })
}

export function createDefaultPaymentMethods(): Promise<IPaymentMethod[]> {
    return fetcher<IPaymentMethod[]>(`${API_URL}/payment-methods/defaults`, { method: "POST" })
}

export async function getCashMovementReasons(filters: { active?: boolean; type?: CashMovementType; requiresApproval?: boolean } = {}): Promise<ICashMovementReason[]> {
    const params = new URLSearchParams()
    if (filters.active !== undefined) params.set("active", String(filters.active))
    if (filters.type) params.set("type", filters.type)
    if (filters.requiresApproval !== undefined) params.set("requiresApproval", String(filters.requiresApproval))
    const query = params.toString()
    const response = await fetcher<ICashMovementReason[]>(`${API_URL}/cash-movement-reasons${query ? `?${query}` : ""}`)
    return Array.isArray(response) ? response : []
}

export function createCashMovementReason(payload: ICreateCashMovementReason): Promise<ICashMovementReason> {
    return fetcher<ICashMovementReason>(`${API_URL}/cash-movement-reasons`, { method: "POST", body: JSON.stringify(payload) })
}

export function updateCashMovementReason(id: string, payload: IUpdateCashMovementReason): Promise<ICashMovementReason> {
    return fetcher<ICashMovementReason>(`${API_URL}/cash-movement-reasons/${id}`, { method: "PATCH", body: JSON.stringify(payload) })
}

export function createDefaultCashMovementReasons(): Promise<ICashMovementReason[]> {
    return fetcher<ICashMovementReason[]>(`${API_URL}/cash-movement-reasons/defaults`, { method: "POST" })
}

export async function getCashDenominations(filters: { active?: boolean; type?: CashDenominationType } = {}): Promise<ICashDenomination[]> {
    const params = new URLSearchParams()
    if (filters.active !== undefined) params.set("active", String(filters.active))
    if (filters.type) params.set("type", filters.type)
    const query = params.toString()
    const response = await fetcher<ICashDenomination[]>(`${API_URL}/cash-denominations${query ? `?${query}` : ""}`)
    return Array.isArray(response) ? response : []
}

export function createCashDenomination(payload: ICreateCashDenomination): Promise<ICashDenomination> {
    return fetcher<ICashDenomination>(`${API_URL}/cash-denominations`, { method: "POST", body: JSON.stringify(payload) })
}

export function updateCashDenomination(id: string, payload: IUpdateCashDenomination): Promise<ICashDenomination> {
    return fetcher<ICashDenomination>(`${API_URL}/cash-denominations/${id}`, { method: "PATCH", body: JSON.stringify(payload) })
}

export function createDefaultCashDenominations(): Promise<ICashDenomination[]> {
    return fetcher<ICashDenomination[]>(`${API_URL}/cash-denominations/defaults`, { method: "POST" })
}
