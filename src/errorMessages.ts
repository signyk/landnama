import { logError } from './errorLog'

const BY_CODE: Record<string, string> = {
    invalid_credentials: 'Rangt netfang eða lykilorð.',
    email_not_confirmed:
        'Þú átt eftir að staðfesta netfangið þitt. Athugaðu pósthólfið (og ruslpóstinn).',
    email_exists: 'Þetta netfang er þegar skráð.',
    user_already_exists: 'Þetta netfang er þegar skráð.',
    email_address_invalid: 'Ógilt netfang.',
    weak_password: 'Lykilorðið er of veikt. Veldu lengra eða flóknara lykilorð.',
    same_password: 'Nýja lykilorðið má ekki vera það sama og það gamla.',
    over_email_send_rate_limit: 'Of margir tölvupóstar sendir. Bíddu aðeins og reyndu aftur.',
    over_request_rate_limit: 'Of margar tilraunir. Bíddu aðeins og reyndu aftur.',
    signup_disabled: 'Nýskráning er lokuð í augnablikinu.',
    otp_expired: 'Hlekkurinn er útrunninn. Biddu um nýjan.',
    session_not_found: 'Innskráningin er útrunnin. Skráðu þig inn aftur.',
    session_expired: 'Innskráningin er útrunnin. Skráðu þig inn aftur.',
    refresh_token_not_found: 'Innskráningin er útrunnin. Skráðu þig inn aftur.',
    // RPC errors returned as { error: '...' } from join_via_link
    'Invalid invite link': 'Ógildur boðstengill.',
}

const NETWORK = 'Engin tenging. Athugaðu nettenginguna og reyndu aftur.'
const FALLBACK = 'Eitthvað fór úrskeiðis. Reyndu aftur.'

type ErrorLike = { message?: string; code?: string; name?: string }

/** Icelandic text for a Supabase error. Unrecognised errors are logged and get a generic message. */
export function errorMessage(context: string, err: ErrorLike | string): string {
    const e: ErrorLike = typeof err === 'string' ? { message: err } : err
    const known = (e.code && BY_CODE[e.code]) || (e.message && BY_CODE[e.message])
    if (known) return known
    if (e.name === 'AuthSessionMissingError') return BY_CODE.session_not_found
    if (
        e.name === 'AuthRetryableFetchError' ||
        /failed to fetch|networkerror|load failed/i.test(e.message ?? '')
    )
        return NETWORK
    logError(context, e)
    return FALLBACK
}
