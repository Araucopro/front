import { getClients } from "@/actions/clients/getClients"
import ClientsClient from "@/components/Clientes/ClientsClient"
import type { IClientsResponse } from "@/interfaces/clients/IClient"

export default async function ClientsPage() {
    let data: IClientsResponse = {
        clients: [],
        meta: { page: 1, limit: 50, total: 0 },
    }
    let loadError: string | undefined

    try {
        data = await getClients({ page: 1, limit: 50 })
    } catch (error) {
        loadError = error instanceof Error ? error.message : "No se pudieron cargar los clientes."
    }

    return (
        <div className="mx-auto flex-1 px-4 py-2 sm:px-6 lg:px-8">
            <ClientsClient initialData={data} loadError={loadError} />
        </div>
    )
}
