export interface ICommerceChannel {
    channelID: string
    tenantID: string
    storeID: string
    code: string
    name: string
    domain: string | null
    active: boolean
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
}

export interface IUpdateCommerceChannel {
    name?: string
    storeID?: string
    domain?: string
    active?: boolean
}
