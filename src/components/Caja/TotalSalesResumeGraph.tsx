"use client"
import { updateMeta } from "@/actions/totals/updateMeta"
import { getMetaMensual } from "@/actions/totals/getMetaMensual"
import { CurrencyInput } from "@/components/ui/currency-input"
import { toast } from "sonner"
import { useEffect, useState } from "react"
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts"
import { toPrice } from "@/utils/priceFormat"
import { IResume } from "@/interfaces/sales/ISalesResume"
import { useRouter } from "next/navigation"
import { useAuth } from "@/stores/user.store"
import { useTienda } from "@/stores/tienda.store"
import { Role } from "@/lib/userRoles"
import { toMonthlyPeriod } from "@/utils/monthPeriod"

export default function TotalSalesResumeGraph({ resume, date }: { resume: IResume; date?: string }) {
    const [editingMeta, setEditingMeta] = useState(false)
    const [metaInput, setMetaInput] = useState("")
    const [meta, setMeta] = useState(0)
    const [loadingMeta, setLoadingMeta] = useState(true)
    const route = useRouter()
    const { user } = useAuth()
    const { storeSelected } = useTienda()
    const period = toMonthlyPeriod(date)

    useEffect(() => {
        let cancelled = false

        const loadMeta = async () => {
            if (!storeSelected?.storeID) {
                setMeta(0)
                setLoadingMeta(false)
                return
            }

            setLoadingMeta(true)
            try {
                const currentMeta = await getMetaMensual(storeSelected.storeID, period)
                if (!cancelled) {
                    setMeta(currentMeta)
                }
            } catch (error) {
                console.error(error)
                if (!cancelled) {
                    setMeta(0)
                }
            } finally {
                if (!cancelled) {
                    setLoadingMeta(false)
                }
            }
        }

        loadMeta()

        return () => {
            cancelled = true
        }
    }, [period, storeSelected?.storeID])

    const handleMetaSave = async () => {
        const metaNumber = Number(metaInput)
        if (!metaInput || isNaN(metaNumber) || metaNumber <= 0) {
            toast.error("Ingresa una meta válida")
            setEditingMeta(false)
            return
        }

        try {
            if (!storeSelected || !storeSelected.storeID) return toast.error("Falta seleccionar una tienda")
            const result = await updateMeta(storeSelected!.storeID, metaNumber, period)
            if (result) {
                setMeta(result)
                setMetaInput(result.toString())
                toast.success(`Meta actualizada a $${toPrice(metaNumber)}`)
                route.refresh()
            } else {
                toast.error("No se pudo guardar la meta")
            }
        } catch (err) {
            console.error(err)
            toast.error("Ocurrió un error al guardar la meta")
        } finally {
            setEditingMeta(false)
        }
    }

    // Calculate progress percentage
    const getProgressPercentage = () => {
        const sales = resume?.periodSummary.month.total ?? 0
        if (meta === 0) return 0
        return Math.min((sales / meta) * 100)
    }

    // Generate chart data based on actual progress
    const getChartData = () => {
        const percentage = getProgressPercentage()
        return [
            {
                name: "Ventas",
                value: percentage,
                fill:
                    percentage >= 100
                        ? "#10b981"
                        : percentage >= 75
                          ? "#0ea5e9"
                          : percentage >= 50
                            ? "#f59e0b"
                            : "#ef4444",
            },
        ]
    }
    if (user?.role !== Role.Admin && storeSelected?.role !== Role.Admin) return null
    return (
        <div className="flex flex-col items-center dark:bg-gray-800 bg-white p-4 py-5 rounded">
            <h3 className="text-sm dark:text-gray-500 text-gray-600 mb-2">Ventas del Mes VS Meta</h3>
            <RadialBarChart
                width={200}
                height={200}
                cx={100}
                cy={100}
                innerRadius={60}
                outerRadius={80}
                barSize={20}
                data={getChartData()}
                startAngle={180}
                endAngle={0}
            >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background dataKey="value" suppressHydrationWarning />
            </RadialBarChart>

            <p className="text-xl -mt-6 dark:text-white font-bold">
                ${toPrice(resume?.periodSummary.month.total ?? 0)}
            </p>
            {editingMeta ? (
                <CurrencyInput
                    value={metaInput}
                    onValueChange={setMetaInput}
                    onBlur={handleMetaSave}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleMetaSave()
                        }
                    }}
                    autoFocus
                    className="w-32 mx-auto text-sm text-center"
                />
            ) : (
                <p
                    className="text-sm text-gray-500 cursor-pointer hover:underline"
                    onClick={() => {
                        setMetaInput(meta.toString())
                        setEditingMeta(true)
                    }}
                >
                    Meta: ${toPrice(loadingMeta ? 0 : meta)}
                </p>
            )}

            <p className="text-sm font-medium mt-1" style={{ color: getChartData()[0].fill }}>
                {getProgressPercentage().toFixed(1)}% completado
            </p>
        </div>
    )
}
