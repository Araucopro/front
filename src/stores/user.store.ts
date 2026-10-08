import { create } from "zustand"
import { persist } from "zustand/middleware"
import { IUser } from "@/interfaces/users/IUser"
import { useTienda } from "./tienda.store"
import { useSaleStore } from "./sale.store"

interface UserStore {
    user: IUser | null
    token: string | null
    users: IUser[]
    setUsers: (users: IUser[]) => void
    setUser: (user: IUser, token: string) => void
    logout: () => void
}

export const useAuth = create(
    persist<UserStore>(
        (set) => ({
            user: null,
            token: null,
            setUser: (user, token) => set({ user, token }),
            users: [],
            setUsers: (users) => set({ users }),
            logout: () => {
                useSaleStore.getState().actions.clearCart()
                const { cleanStores } = useTienda.getState()
                cleanStores()
                set({ user: null, token: null, users: [] })
            },
        }),
        { name: "auth-storage" },
    ),
)
