export interface IMasterUser {
    masterUserID: string
    email: string
    role: string
}

export interface IMasterAuthResponse {
    masterUser: IMasterUser
    accessToken: string
}
