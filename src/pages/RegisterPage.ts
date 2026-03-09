import { navigateTo } from '../router'
import { supabase } from '../supabase'

export const RegisterPage = {
  render(_params: Record<string, string>): HTMLElement {
    const el = document.createElement('div')
    el.innerHTML = `
      <div class="auth-page">
        <h1>Búa til aðgang</h1>
        <form id="register-form">
          <input type="text" id="display-name" placeholder="Nafn (til birtingar)" required />
          <input type="email" id="email" placeholder="Netfang" required />
          <input type="password" id="password" placeholder="Lykilorð (lágmark 6 stafir)" required minlength="6" />
          <button type="submit">Nýskrá</button>
          <p id="error" class="error"></p>
        </form>
        <p>Ertu nú þegar með aðgang? <a href="/">Skrá inn</a></p>
      </div>
    `

    el.querySelector('#register-form')!.addEventListener('submit', async (e) => {
      e.preventDefault()
      const displayName = (el.querySelector('#display-name') as HTMLInputElement).value.trim()
      const email = (el.querySelector('#email') as HTMLInputElement).value
      const password = (el.querySelector('#password') as HTMLInputElement).value
      const errEl = el.querySelector('#error') as HTMLElement

      errEl.textContent = ''
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      })

      if (error) {
        errEl.textContent = error.message
      } else {
        navigateTo('/home')
      }
    })

    return el
  },
}
