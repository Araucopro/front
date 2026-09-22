type CurrencyNormalizationOptions = {
    allowDecimals?: boolean
    decimalScale?: number
}

const normalizeIntegerDigits = (value: string) => {
    const withoutLeadingZeros = value.replace(/^0+(?=\d)/, "")
    return withoutLeadingZeros || (value ? "0" : "")
}

export const normalizeCurrencyValue = (
    value: string | number,
    { allowDecimals = false, decimalScale = 2 }: CurrencyNormalizationOptions = {},
) => {
    const source = String(value).trim()
    if (!source) return ""

    if (!allowDecimals) {
        return normalizeIntegerDigits(source.replace(/\D/g, ""))
    }

    const commaIndex = source.lastIndexOf(",")
    const isRawDecimal = !source.includes("$") && /^\d+\.\d*$/.test(source)
    const decimalIndex = commaIndex >= 0 ? commaIndex : isRawDecimal ? source.lastIndexOf(".") : -1

    if (decimalIndex === -1) {
        return normalizeIntegerDigits(source.replace(/\D/g, ""))
    }

    const integerPart = normalizeIntegerDigits(source.slice(0, decimalIndex).replace(/\D/g, "")) || "0"
    const decimalPart = source
        .slice(decimalIndex + 1)
        .replace(/\D/g, "")
        .slice(0, decimalScale)

    return `${integerPart}.${decimalPart}`
}

export const formatCurrencyInput = (
    value: string | number,
    options: CurrencyNormalizationOptions = {},
) => {
    const normalizedValue = normalizeCurrencyValue(value, options)
    if (!normalizedValue) return ""

    const hasDecimalSeparator = normalizedValue.includes(".")
    const [integerPart, decimalPart = ""] = normalizedValue.split(".")
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")

    return `$ ${formattedInteger}${hasDecimalSeparator ? `,${decimalPart}` : ""}`
}
