import { supabase } from '../supabase'
import { authStore } from '../auth/authStore'
import { navigateTo } from '../router'
import { navbar, initNavHamburger } from '../components/nav'

export const CreateLeaderboardPage = {
    render(_params: Record<string, string>): HTMLElement {
        const el = document.createElement('div')
        const user = authStore.user!

        el.innerHTML = `
      ${navbar('leaderboards', user.id)}
      <div class="page-content">
        <h1>Búa til stigatöflu</h1>
        <form id="create-form">
          <label>Heiti
            <input type="text" id="name" placeholder="Fjölskylda, Vinir, Vinna…" required maxlength="60" />
          </label>
          <label>Lýsing (valfrjálst)
            <input type="text" id="description" placeholder="Stutt lýsing" maxlength="120" />
          </label>
          <button type="submit">Búa til</button>
          <p id="error" class="error"></p>
        </form>
      </div>
    `

        el.querySelector('#create-form')!.addEventListener('submit', async (e) => {
            e.preventDefault()
            const name = (el.querySelector('#name') as HTMLInputElement).value.trim()
            const description = (el.querySelector('#description') as HTMLInputElement).value.trim()
            const errEl = el.querySelector('#error') as HTMLElement

            const { data, error } = await supabase
                .from('leaderboards')
                .insert({ name, description: description || null, owner_id: user.id })
                .select('id')
                .single()

            if (error) {
                errEl.textContent = error.message
            } else {
                // Also add creator as a member
                await supabase.from('leaderboard_members').insert({
                    leaderboard_id: data.id,
                    user_id: user.id,
                })
                navigateTo(`/leaderboards/${data.id}`)
            }
        })

        initNavHamburger(el)
        return el
    },
}
