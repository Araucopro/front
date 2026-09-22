const MAX_RUT_CHARACTERS = 9

export const normalizeRutValue = (value: string) => {
    const compactRut = value.replace(/[^0-9kK]/g, "").toUpperCase().slice(0, MAX_RUT_CHARACTERS)

    if (compactRut.length <= 1) return compactRut

    return `${compactRut.slice(0, -1)}-${compactRut.slice(-1)}`
}

export const formatRut = (value: string) => {
    const normalizedRut = normalizeRutValue(value)
    const separatorIndex = normalizedRut.lastIndexOf("-")

    if (separatorIndex === -1) return normalizedRut

    const body = normalizedRut.slice(0, separatorIndex)
    const verificationDigit = normalizedRut.slice(separatorIndex + 1)
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")

    return `${formattedBody}-${verificationDigit}`
}
