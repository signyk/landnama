import { supabase } from '../supabase'

export const ForgotPasswordPage = {
    render(_params: Record<string, string>): HTMLElement {
        const el = document.createElement('div')
        el.innerHTML = `
      <div class="auth-page">
        <h1>Landnáma</h1>
        <p>Sláðu inn netfangið þitt og við sendum þér hlekk til að endurstilla lykilorðið.</p>
        <form id="forgot-form">
          <input type="email" id="email" placeholder="Netfang" required />
          <button type="submit">Senda hlekk</button>
          <p id="error" class="error"></p>
          <p id="success" class="success"></p>
        </form>
        <p><a href="/">Til baka</a></p>
      </div>
    `

        el.querySelector('#forgot-form')!.addEventListener('submit', async (e) => {
            e.preventDefault()
            const email = (el.querySelector('#email') as HTMLInputElement).value
            const errEl = el.querySelector('#error') as HTMLElement
            const successEl = el.querySelector('#success') as HTMLElement

            errEl.textContent = ''
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (error) {
                errEl.textContent = error.message
            } else {
                successEl.textContent = 'Hlekkur hefur verið sendur á netfangið þitt.'
            }
        })

        return el
    },
}
