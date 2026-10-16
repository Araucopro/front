"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const NOTE_PREVIEW_LENGTH = 120

type ClientNotesProps = {
    notes: string | null
    clientName: string
}

export default function ClientNotes({ notes, clientName }: ClientNotesProps) {
    const note = notes?.trim() || ""

    if (note.length <= NOTE_PREVIEW_LENGTH) {
        return <p className="whitespace-pre-wrap break-words">{note || "Sin notas"}</p>
    }

    return (
        <div className="space-y-2">
            <p className="whitespace-pre-wrap break-words">{note.slice(0, NOTE_PREVIEW_LENGTH)}…</p>
            <Dialog>
                <DialogTrigger asChild>
                    <Button type="button" variant="link" size="sm" className="h-auto p-0">
                        Ver nota completa
                    </Button>
                </DialogTrigger>
                <DialogContent className="flex w-[calc(100%-2rem)] max-w-xl flex-col gap-4 p-6">
                    <DialogHeader className="pr-6">
                        <DialogTitle>Nota completa</DialogTitle>
                        <DialogDescription className="break-words">{clientName}</DialogDescription>
                    </DialogHeader>
                    <p className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {notes}
                    </p>
                </DialogContent>
            </Dialog>
        </div>
    )
}
