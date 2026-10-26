export interface ICommerceChannel {
    channelID: string
    tenantID: string
    storeID: string
    code: string
    name: string
    domain: string | null
    active: boolean
    salesEnabled: boolean
    acceptTestPayments: boolean
    requireProductPhoto: boolean
    createdAt: string
    updatedAt: string
}

export interface ICommerceChannelWithToken extends ICommerceChannel {
    token: string
}

export interface ICreateCommerceChannel {
    code: string
    name: string
    storeID: string
    domain?: string
    salesEnabled?: boolean
    acceptTestPayments?: boolean
    requireProductPhoto?: boolean
}

export interface IUpdateCommerceChannel {
    name?: string
    storeID?: string
    domain?: string
    active?: boolean
    salesEnabled?: boolean
    acceptTestPayments?: boolean
    requireProductPhoto?: boolean
}
