/**
 * Interfaz de UI para gastos. El contrato vigente del back está en
 * Scalar (POST /expenses, CreateExpenseDto): el back recibe neto e
 * IVA por separado y calcula `amount` = netAmount + taxAmount. Los
 * tipos válidos son administrative, operational y financial.
 *
 * La respuesta del back trae `id` y la tienda como objeto `store`;
 * el normalizador (src/lib/normalize-expense.ts) los adapta a esta
 * interfaz, que mantiene la convención del front de IDs con sufijo
 * `ID` (expenseID, storeID).
 */
export type ExpenseType = "administrative" | "operational" | "financial"

export interface IExpense {
    expenseID: string
    name: string
    deductibleDate: string
    amount: number
    netAmount: number
    taxAmount: number
    acceptedForTax: boolean
    taxCredit: boolean
    supportDocument: string | null
    type: ExpenseType
    storeID: string
    storeName?: string
    createdAt?: string
    updatedAt?: string
}

/** Payload de creación según CreateExpenseDto de Scalar. */
export interface ICreateExpense {
    name: string
    deductibleDate: string
    netAmount: number
    taxAmount: number
    type: ExpenseType
    storeID: string
    acceptedForTax?: boolean
    taxCredit?: boolean
    supportDocument?: string
}

/** Payload de actualización según UpdateExpenseDto de Scalar (todo opcional). */
export type IUpdateExpense = Partial<ICreateExpense>
