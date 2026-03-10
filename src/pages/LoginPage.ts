import { navigateTo } from '../router'
import { supabase } from '../supabase'

export const LoginPage = {
    render(_params: Record<string, string>): HTMLElement {
        const el = document.createElement('div')
        el.innerHTML = `
      <div class="auth-page">
        <h1>Landnáma</h1>
        <p>Hvaða lönd hefur þú heimsótt?</p>
        <form id="login-form">
          <input type="email" id="email" placeholder="Netfang" required />
          <input type="password" id="password" placeholder="Lykilorð" required />
          <button type="submit">Skrá inn</button>
          <p id="error" class="error"></p>
        </form>
        <p>Ekki með aðgang? <a href="/register">Nýskrá</a></p>
        <p><a href="/forgot-password">Gleymt lykilorð?</a></p>
        <p><a href="/privacy" class="muted" style="font-size:0.8rem">Persónuverndarstefna</a></p>
      </div>
    `

        el.querySelector('#login-form')!.addEventListener('submit', async (e) => {
            e.preventDefault()
            const email = (el.querySelector('#email') as HTMLInputElement).value
            const password = (el.querySelector('#password') as HTMLInputElement).value
            const errEl = el.querySelector('#error') as HTMLElement

            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) {
                errEl.textContent = error.message
            } else {
                const redirect = sessionStorage.getItem('redirectAfterAuth')
                sessionStorage.removeItem('redirectAfterAuth')
                navigateTo(redirect ?? '/home')
            }
        })

        return el
    },
}
