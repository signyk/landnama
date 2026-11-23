import { navigateTo } from '../router'
import { errorMessage } from '../errorMessages'
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
                msgEl.textContent = errorMessage('join leaderboard', error ?? data.error)
            } else {
                msgEl.textContent = 'Bætt við! Endurvísar...'
                setTimeout(() => navigateTo(`/leaderboards/${data.leaderboard_id}`), 1500)
            }
        })

        return el
    },
}
