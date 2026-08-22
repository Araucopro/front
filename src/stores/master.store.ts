import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { IMasterUser } from "@/interfaces/auth/IMasterSession"

interface MasterAuthStore {
    masterUser: IMasterUser | null
    setMasterUser: (masterUser: IMasterUser) => void
    clearMasterUser: () => void
}

export const useMasterAuth = create(
    persist<MasterAuthStore>(
        (set) => ({
            masterUser: null,
            setMasterUser: (masterUser) => set({ masterUser }),
            clearMasterUser: () => set({ masterUser: null }),
        }),
        { name: "master-auth-storage" },
    ),
)
