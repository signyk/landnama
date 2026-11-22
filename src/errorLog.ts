import { supabase } from './supabase'
import { authStore } from './auth/authStore'

const MAX_PER_PAGE_LOAD = 20
const lastSent = new Map<string, number>()
let sentCount = 0

function describe(err: unknown): { message: string; stack: string | null } {
    if (err instanceof Error)
        return { message: `${err.name}: ${err.message}`, stack: err.stack ?? null }
    if (err && typeof err === 'object' && 'message' in err) {
        // Supabase errors: keep message and code, never `details` (can contain row values)
        const e = err as { message: unknown; code?: unknown }
        return { message: String(e.message) + (e.code ? ` (${String(e.code)})` : ''), stack: null }
    }
    return { message: String(err), stack: null }
}

export function logError(context: string, err: unknown): void {
    console.error(context, err)
    if (!authStore.user || sentCount >= MAX_PER_PAGE_LOAD) return

    const { message, stack } = describe(err)
    const full = `${context}: ${message}`
    const now = Date.now()
    if (now - (lastSent.get(full) ?? 0) < 60_000) return
    lastSent.set(full, now)
    sentCount++

    supabase
        .rpc('log_client_error', {
            p_message: full,
            p_stack: stack,
            p_path: location.pathname,
            p_user_agent: navigator.userAgent,
        })
        .then(
            ({ error }) => {
                if (error) console.warn('error log failed:', error)
            },
            () => undefined,
        )
}

export function initErrorLog(): void {
    window.addEventListener('error', (e) => logError('uncaught', e.error ?? e.message))
    window.addEventListener('unhandledrejection', (e) => logError('unhandled rejection', e.reason))
}
