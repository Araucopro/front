"use client"

import * as React from "react"
import { Input, type InputProps } from "@/components/ui/input"
import { formatCurrencyInput, normalizeCurrencyValue } from "@/utils/currency"

export interface CurrencyInputProps extends Omit<InputProps, "value" | "defaultValue" | "onChange" | "type"> {
    value?: string | number
    onValueChange?: (value: string) => void
    allowDecimals?: boolean
    decimalScale?: number
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
    (
        {
            value = "",
            onValueChange,
            allowDecimals = false,
            decimalScale = 2,
            maxLength = 24,
            ...props
        },
        ref,
    ) => {
        const normalizationOptions = { allowDecimals, decimalScale }

        return (
            <Input
                {...props}
                ref={ref}
                type="text"
                inputMode={allowDecimals ? "decimal" : "numeric"}
                maxLength={maxLength}
                value={formatCurrencyInput(value, normalizationOptions)}
                onChange={(event) =>
                    onValueChange?.(normalizeCurrencyValue(event.target.value, normalizationOptions))
                }
            />
        )
    },
)

CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
