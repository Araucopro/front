import { create } from "zustand"
import { IStore } from "@/interfaces/stores/IStore"
import { persist } from "zustand/middleware"

interface TiendaStore {
    stores: IStore[]
    storesFromUser: IStore[]
    storeSelected: IStore | null
    setStores: (stores: IStore[]) => void
    setStoresUser: (storesFromUser: IStore[]) => void
    setStoreSelected: (store: IStore | null) => void
    replaceStore: (store: IStore) => void
    cleanStores: () => void
}

export const useTienda = create(
    persist<TiendaStore>(
        (set) => ({
            stores: [],
            storesFromUser: [],
            storeSelected: null,
            setStores: (stores) => set({ stores }),
            setStoresUser: (storesFromUser) => set({ storesFromUser }),
            setStoreSelected: (store) => {
                set({ storeSelected: store })
            },
            replaceStore: (store) =>
                set((state) => ({
                    stores: state.stores.map((item) => (item.storeID === store.storeID ? store : item)),
                    storesFromUser: state.storesFromUser.map((item) =>
                        item.storeID === store.storeID ? store : item,
                    ),
                    storeSelected: state.storeSelected?.storeID === store.storeID ? store : state.storeSelected,
                })),
            cleanStores: () => {
                set({ stores: [], storesFromUser: [], storeSelected: null })
            },
        }),
        { name: "stores" }
    )
)
