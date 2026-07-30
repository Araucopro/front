import AccessSelector from "@/components/Master/AccessSelector"
import { getTenants } from "@/actions/master/tenantActions"

export default async function AccessPage() {
    try {
        const tenants = await getTenants({
            limit: 100,
            offset: 0,
            status: "ACTIVE",
        })
        return <AccessSelector initialTenants={tenants} />
    } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudieron cargar los accesos"
        return <AccessSelector initialError={message} />
    }
}
