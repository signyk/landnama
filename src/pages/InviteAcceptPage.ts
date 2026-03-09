import { navigateTo } from '../router'
import { supabase } from '../supabase'

export const InviteAcceptPage = {
    render(params: Record<string, string>): HTMLElement {
        const el = document.createElement('div')
        el.innerHTML = `<div class="auth-page"><p>Tekur þátt í stigatöflu...</p><p id="msg"></p></div>`

        const token = params['token']
        const msgEl = el.querySelector('#msg') as HTMLElement

        if (!token) {
            msgEl.textContent = 'Ógildur boðstengill.'
            return el
        }

        supabase.rpc('join_via_link', { p_token: token }).then(({ data, error }) => {
            if (error || data?.error) {
                msgEl.textContent = error?.message ?? data?.error ?? 'Tókst ekki að taka þátt.'
            } else {
                msgEl.textContent = 'Bætt við! Endurvísar...'
                setTimeout(() => navigateTo(`/leaderboards/${data.leaderboard_id}`), 1500)
            }
        })

        return el
    },
}
