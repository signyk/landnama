import { navigateTo } from '../router'
import { errorMessage } from '../errorMessages'
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
        <p class="muted" style="font-size:0.8rem">Með því að nýskrá samþykkir þú <a href="/privacy">persónuverndarstefnu</a> okkar.</p>
      </div>
    `

        el.querySelector('#register-form')!.addEventListener('submit', async (e) => {
            e.preventDefault()
            const displayName = (el.querySelector('#display-name') as HTMLInputElement).value.trim()
            const email = (el.querySelector('#email') as HTMLInputElement).value
            const password = (el.querySelector('#password') as HTMLInputElement).value
            const errEl = el.querySelector('#error') as HTMLElement

            errEl.textContent = ''
            const redirect = sessionStorage.getItem('redirectAfterAuth')
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { display_name: displayName },
                    // Confirmation link may open in a new tab where sessionStorage is empty
                    emailRedirectTo: `${window.location.origin}${redirect ?? '/home'}`,
                },
            })

            if (error) {
                errEl.textContent = errorMessage('register', error)
                return
            }
            sessionStorage.removeItem('redirectAfterAuth')
            if (data.session) {
                navigateTo(redirect ?? '/home')
                return
            }
            const page = el.querySelector('.auth-page') as HTMLElement
            page.innerHTML = `
        <h1>Staðfestu netfangið þitt</h1>
        <p>Við sendum staðfestingarhlekk á <strong></strong>. Smelltu á hann til að virkja aðganginn.</p>
        <p class="muted">Ef pósturinn berst ekki innan nokkurra mínútna skaltu athuga ruslpóstinn.</p>
        <p><a href="/">Aftur á innskráningu</a></p>
      `
            page.querySelector('strong')!.textContent = email
        })

        return el
    },
}
