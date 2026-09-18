export type PaymentMethodType =
    | "CASH"
    | "DEBIT_CARD"
    | "CREDIT_CARD"
    | "BANK_TRANSFER"
    | "CHECK"
    | "CREDIT"
    | "OTHER"

export type CashMovementType = "CASH_IN" | "CASH_OUT"
export type CashDenominationType = "COIN" | "BANKNOTE"

export interface IPaymentMethod {
    paymentMethodID: string
    tenantID: string
    code: string
    name: string
    type: PaymentMethodType
    affectsCash: boolean
    active: boolean
    createdAt: string
    updatedAt: string
}

export interface ICreatePaymentMethod {
    code: string
    name: string
    type: PaymentMethodType
    affectsCash?: boolean
    active?: boolean
}

export interface IUpdatePaymentMethod {
    name?: string
    type?: PaymentMethodType
    affectsCash?: boolean
    active?: boolean
}

export interface ICashMovementReason {
    cashMovementReasonID: string
    tenantID: string
    code: string
    name: string
    type: CashMovementType | null
    requiresApproval: boolean
    active: boolean
    createdAt: string
    updatedAt: string
}

export interface ICreateCashMovementReason {
    code: string
    name: string
    type?: CashMovementType | null
    requiresApproval?: boolean
    active?: boolean
}

export interface IUpdateCashMovementReason {
    name?: string
    type?: CashMovementType | null
    requiresApproval?: boolean
    active?: boolean
}

export interface ICashDenomination {
    cashDenominationID: string
    tenantID: string
    value: number
    type: CashDenominationType
    label: string
    sortOrder: number
    active: boolean
    createdAt: string
    updatedAt: string
}

export interface ICreateCashDenomination {
    value: number
    type: CashDenominationType
    label?: string
    sortOrder?: number
    active?: boolean
}

export interface IUpdateCashDenomination {
    label?: string
    sortOrder?: number
    active?: boolean
}
