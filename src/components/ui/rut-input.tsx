"use client"

import * as React from "react"
import { Input, type InputProps } from "@/components/ui/input"
import { formatRut, normalizeRutValue } from "@/utils/rut"

export interface RutInputProps extends Omit<InputProps, "value" | "defaultValue" | "onChange"> {
    value?: string
    onValueChange?: (value: string) => void
}

const RutInput = React.forwardRef<HTMLInputElement, RutInputProps>(
    ({ value = "", onValueChange, maxLength = 12, ...props }, ref) => (
        <Input
            {...props}
            ref={ref}
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            maxLength={maxLength}
            value={formatRut(value)}
            onChange={(event) => onValueChange?.(normalizeRutValue(event.target.value))}
        />
    ),
)

RutInput.displayName = "RutInput"

export { RutInput }
