export const CASH_SESSION_CHANGED_EVENT = "arauco:cash-session-changed"

export function notifyCashSessionChanged() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(CASH_SESSION_CHANGED_EVENT))
    }
}
