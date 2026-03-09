import { supabase } from '../supabase'
import { navigateTo } from '../router'

export const ResetPasswordPage = {
  render(_params: Record<string, string>): HTMLElement {
    const el = document.createElement('div')
    el.innerHTML = `
      <div class="auth-page">
        <h1>Nýtt lykilorð</h1>
        <form id="reset-form">
          <input type="password" id="password" placeholder="Nýtt lykilorð (lágmark 6 stafir)" required minlength="6" />
          <input type="password" id="confirm" placeholder="Staðfesta lykilorð" required minlength="6" />
          <button type="submit">Vista lykilorð</button>
          <p id="error" class="error"></p>
        </form>
      </div>
    `

    el.querySelector('#reset-form')!.addEventListener('submit', async (e) => {
      e.preventDefault()
      const password = (el.querySelector('#password') as HTMLInputElement).value
      const confirm = (el.querySelector('#confirm') as HTMLInputElement).value
      const errEl = el.querySelector('#error') as HTMLElement

      if (password !== confirm) {
        errEl.textContent = 'Lykilorðin stemma ekki.'
        return
      }

      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        errEl.textContent = error.message
      } else {
        navigateTo('/home')
      }
    })

    return el
  },
}
