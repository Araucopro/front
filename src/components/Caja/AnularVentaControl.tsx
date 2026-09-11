"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AnularVentaModal } from "@/components/Modals/AnularVentaModal"
import { ISaleResponse } from "@/interfaces/sales/ISale"

interface AnularVentaControlProps {
    sale: ISaleResponse
}

export default function AnularVentaControl({ sale }: AnularVentaControlProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <Button variant="destructive" onClick={() => setIsModalOpen(true)}>
                Gestionar devolución
            </Button>
            <AnularVentaModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} sale={sale} />
        </>
    )
}
