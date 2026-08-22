import MasterDashboard from "@/components/Master/MasterDashboard"
import { getTenants } from "@/actions/master/tenantActions"

export default async function MasterPage() {
    try {
        const initialTenants = await getTenants({ limit: 10, offset: 0 })
        return <MasterDashboard initialTenants={initialTenants} />
    } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudieron cargar los tenants"
        return <MasterDashboard initialError={message} />
    }
}
