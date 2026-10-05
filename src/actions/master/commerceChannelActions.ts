"use server"

import { cookies } from "next/headers"
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"
import { AUTH_COOKIE_NAME, AUTH_SESSION_COOKIE_NAME, AUTH_SESSION_TYPES } from "@/lib/auth-session"
import type {
    ICommerceChannel,
    ICommerceChannelWithToken,
    ICreateCommerceChannel,
    IUpdateCommerceChannel,
} from "@/interfaces/master/ICommerceChannel"

async function assertMasterSession() {
    const cookieStore = await cookies()
    if (
        !cookieStore.get(AUTH_COOKIE_NAME)?.value ||
        cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value !== AUTH_SESSION_TYPES.MASTER
    ) {
        throw new Error("La sesión master no es válida o expiró")
    }
}

function channelPath(tenantID: string, channelID?: string) {
    const base = `${API_URL}/master/tenants/${encodeURIComponent(tenantID)}/commerce-channels`
    return channelID ? `${base}/${encodeURIComponent(channelID)}` : base
}

export async function getCommerceChannels(tenantID: string): Promise<ICommerceChannel[]> {
    await assertMasterSession()
    return fetcher<ICommerceChannel[]>(channelPath(tenantID))
}

export async function createCommerceChannel(
    tenantID: string,
    payload: ICreateCommerceChannel,
): Promise<ICommerceChannelWithToken> {
    await assertMasterSession()
    return fetcher<ICommerceChannelWithToken>(channelPath(tenantID), {
        method: "POST",
        body: JSON.stringify(payload),
    })
}

export async function updateCommerceChannel(
    tenantID: string,
    channelID: string,
    payload: IUpdateCommerceChannel,
): Promise<ICommerceChannel> {
    await assertMasterSession()
    return fetcher<ICommerceChannel>(channelPath(tenantID, channelID), {
        method: "PATCH",
        body: JSON.stringify(payload),
    })
}

export async function rotateCommerceChannelToken(
    tenantID: string,
    channelID: string,
): Promise<ICommerceChannelWithToken> {
    await assertMasterSession()
    return fetcher<ICommerceChannelWithToken>(`${channelPath(tenantID, channelID)}/rotate-token`, {
        method: "POST",
    })
}
