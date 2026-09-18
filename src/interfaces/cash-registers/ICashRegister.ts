export type CashRegisterStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE"
export type CashSessionStatus = "OPEN" | "SUSPENDED" | "CLOSED"

export interface ICashRegister {
    cashRegisterID: string
    tenantID?: string
    storeID: string
    code: string
    name: string
    status: CashRegisterStatus
    sessions?: ICashSession[]
    createdAt: string
    updatedAt: string
}

export interface ICashSession {
    sessionID: string
    tenantID?: string
    cashRegisterID: string
    businessDate: string
    openedByUserID: string
    closedByUserID: string | null
    openedAt: string
    closedAt: string | null
    openingBalance: number
    expectedCashBalance: number | null
    countedCashBalance: number | null
    cashDifference: number | null
    status: CashSessionStatus
    openingNotes: string | null
    closingNotes: string | null
    createdAt: string
    updatedAt: string
}

export interface ICreateCashRegister {
    storeID: string
    code: string
    name: string
    status?: CashRegisterStatus
}

export interface IUpdateCashRegister {
    code?: string
    name?: string
    status?: CashRegisterStatus
}

export interface IOpenCashSession {
    businessDate: string
    openingBalance: number
    openingNotes?: string
}

export interface ICloseCashSession {
    countedCashBalance: number
    closingNotes?: string
}

export interface ICreateCashMovement {
    type: "CASH_IN" | "CASH_OUT"
    amount: number
    reason: string
    description?: string
}

export interface ICashMovement {
    cashMovementID: string
    sessionID: string
    type: "CASH_IN" | "CASH_OUT"
    amount: number
    status: "POSTED" | "VOIDED"
    reason: string
    referenceType: string
    referenceID: string | null
    description: string | null
    createdByUserID: string
    occurredAt: string
    voidedAt: string | null
}

export interface ICashClosing {
    closingID: string
    sessionID: string
    status: "PENDING" | "COMPLETED" | "REJECTED"
    expectedCashAmount: number
    expectedNonCashAmount: number
    expectedTotalAmount: number
    countedCashAmount: number | null
    actualTotalAmount: number | null
    cashDifference: number | null
    notes: string | null
}

export interface ICashCountItem {
    cashCountItemID: string
    denominationID: string
    denominationValue: number
    denominationType: "COIN" | "BANKNOTE"
    quantity: number
    subtotal: number
}

export interface ICashCount {
    cashCountID: string
    closingID: string
    sessionID: string
    status: "DRAFT" | "COMPLETED" | "CANCELLED"
    totalAmount: number
    itemCount: number
    notes: string | null
    items: ICashCountItem[]
}

export interface ICashSessionFilters {
    status?: CashSessionStatus
    fromBusinessDate?: string
    toBusinessDate?: string
}

export interface ICashSessionSummary {
    session: ICashSession
    cashRegister: Pick<ICashRegister, "cashRegisterID" | "code" | "name" | "storeID" | "status">
    cashMovements: {
        cashIn: number
        cashOut: number
        net: number
        movementCount: number
    }
    payments: {
        paymentCount: number
        totalAmount: number
        cashAmount: number
        nonCashAmount: number
        byMethod: Array<{
            paymentMethodID?: string
            name: string
            type: string
            affectsCash?: boolean
            totalAmount: number
            paymentCount: number
        }>
    }
    transfers: {
        sentCount: number
        sentAmount: number
        receivedCount: number
        receivedAmount: number
        pendingCount: number
        pendingAmount: number
    }
    expected: {
        openingBalance: number
        expectedCashAmount: number
        expectedNonCashAmount: number
        expectedTotalAmount: number
    }
    closing: unknown | null
    operators: unknown[]
    cashCount: unknown | null
}

export interface IStoreCashSummary {
    storeID: string
    from: string
    to: string
    sessionCount: number
    openSessionCount: number
    closedSessionCount: number
    openingBalanceTotal: number
    expectedCashTotal: number
    countedCashTotal: number
    cashDifferenceTotal: number
    cashMovements: {
        cashIn: number
        cashOut: number
        net: number
        movementCount: number
    }
    payments: {
        paymentCount: number
        totalAmount: number
        cashAmount: number
        nonCashAmount: number
        byMethod: Array<{
            name: string
            type: string
            totalAmount: number
            paymentCount: number
        }>
    }
    byDate: Array<{
        businessDate: string
        sessionCount: number
        openSessionCount: number
        closedSessionCount: number
        openingBalance: number
        cashIn: number
        cashOut: number
        netCash: number
        paymentTotal: number
        transfersOutAmount: number
        transfersInAmount: number
        expectedCash: number
        countedCash: number
        cashDifference: number
    }>
    byRegister: Array<{
        cashRegisterID: string
        code: string
        name: string
        sessionCount: number
        openSessionCount: number
        closedSessionCount: number
        cashIn: number
        cashOut: number
        netCash: number
        paymentTotal: number
        transfersOutAmount: number
        transfersInAmount: number
        expectedCash: number
        countedCash: number
        cashDifference: number
    }>
    byOperator: Array<{
        userID: string
        sessionsAttended: number
        movementsRegistered: number
        cashIn: number
        cashOut: number
        netCash: number
        countsPerformed: number
    }>
    pendingTransfers: Array<{
        cashTransferID: string
        status: string
        amount: number
        destinationType: string
        sourceCashRegisterID: string
        sourceSessionID: string
        destinationCashRegisterID: string | null
        destinationLabel: string | null
        businessDate: string
        requestedAt: string
        requestedByUserID: string
    }>
}
