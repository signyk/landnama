import { supabase } from '../supabase'
import { errorMessage } from '../errorMessages'
import { downloadVisitsCsv } from '../exportVisits'
import { prepareShareImage, shareImage } from '../shareImage'
import type { ShareKind } from '../shareImage'
import { logError } from '../errorLog'
import { authStore } from '../auth/authStore'
import { territories, allTerritories } from '../data/territories'
import { navbar, initNavHamburger } from '../components/nav'
import { MapView } from '../components/MapView'
import { createSail } from '../components/ship'
import { computeBadgeCategories, regionLabel, TIER_LABELS } from '../badges'

export const ProfilePage = {
    render(params: Record<string, string>): HTMLElement {
        const el = document.createElement('div')
        const currentUser = authStore.user!
        const uid = params['uid']
        const isOwnProfile = uid === currentUser.id

        el.innerHTML = `
      ${navbar(isOwnProfile ? 'profile' : null, currentUser.id)}
      <div class="page-content page-wide">
        <div id="profile-header" class="page-header">
          ${!isOwnProfile ? '<button id="back-btn" class="back-link">← Til baka</button>' : ''}
          <h1 id="profile-name">Hleður…</h1>
          <span id="profile-count" class="count-badge"></span>
          ${isOwnProfile ? '<button id="share-btn" class="btn-ghost" disabled>Deila mynd</button>' : ''}
          ${isOwnProfile ? '<button id="signout-btn" class="btn-ghost btn-signout">Skrá út</button>' : ''}
        </div>
        <section class="profile-views">
          <div class="view-tabs" role="group" aria-label="Sýn">
            <button type="button" data-view="map" aria-pressed="true">Kort</button>
            <button type="button" data-view="ship" aria-pressed="false">Knörr</button>
          </div>
          <div id="map-container" class="map-container profile-view">
            <div class="map-loading">Hleður korti…</div>
          </div>
          <div id="ship-view" class="profile-view profile-ship" hidden></div>
        </section>
        <div id="badges-section" class="badges-section">
          <h2 class="section-title">Merki</h2>
          <ul id="badge-list" class="badge-list"></ul>
        </div>
        <div id="territory-list" class="profile-territory-list"></div>
        ${
            isOwnProfile
                ? `
        <section class="account-section">
          <h2 class="section-title">Aðgangur</h2>
          <form id="name-form" class="settings-row">
            <div class="settings-label">
              <h3>Nafn</h3>
              <p class="muted">Birtist á stigatöflum.</p>
            </div>
            <div class="settings-fields">
              <input type="text" id="display-name-input" aria-label="Nafn" placeholder="Nafn (til birtingar)" maxlength="60" autocomplete="name" required />
              <button type="submit" class="btn">Breyta nafni</button>
              <p id="name-error" class="error"></p>
              <p id="name-success" class="success"></p>
            </div>
          </form>
          <form id="email-form" class="settings-row">
            <div class="settings-label">
              <h3>Netfang</h3>
              <p class="muted">Núverandi: <span id="current-email"></span></p>
              <p id="pending-email" class="muted hidden"></p>
            </div>
            <div class="settings-fields">
              <input type="email" id="new-email" aria-label="Nýtt netfang" placeholder="Nýtt netfang" autocomplete="email" required />
              <button type="submit" class="btn">Breyta netfangi</button>
              <p id="email-error" class="error"></p>
              <p id="email-success" class="success"></p>
            </div>
          </form>
          <form id="password-form" class="settings-row">
            <div class="settings-label">
              <h3>Lykilorð</h3>
            </div>
            <div class="settings-fields">
              <input type="password" id="current-password" aria-label="Núverandi lykilorð" placeholder="Núverandi lykilorð" autocomplete="current-password" required />
              <input type="password" id="new-password" aria-label="Nýtt lykilorð" placeholder="Nýtt lykilorð (lágmark 6 stafir)" autocomplete="new-password" required minlength="6" />
              <input type="password" id="confirm-password" aria-label="Staðfesta nýtt lykilorð" placeholder="Staðfesta nýtt lykilorð" autocomplete="new-password" required minlength="6" />
              <button type="submit" class="btn">Breyta lykilorði</button>
              <p id="password-error" class="error"></p>
              <p id="password-success" class="success"></p>
            </div>
          </form>
          <div class="settings-row">
            <div class="settings-label">
              <h3>Gögnin þín</h3>
              <p class="muted">Sæktu lista yfir löndin og svæðin sem þú hefur heimsótt sem CSV-skrá.</p>
            </div>
            <div class="settings-fields">
              <button id="export-btn" class="btn">Sækja CSV</button>
              <p id="export-error" class="error"></p>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-label">
              <h3>Eyða aðgangi</h3>
              <p class="muted">Þetta eyðir öllum ferðagögnum þínum og er óafturkræft. Stigatöflur sem þú átt færast til annars meðlims.</p>
            </div>
            <div class="settings-fields">
              <button id="delete-account-btn" class="btn-danger">Eyða aðgangi</button>
              <span id="delete-error" class="error"></span>
            </div>
          </div>
        </section>
        `
                : ''
        }
      </div>
    `

        const nameEl = el.querySelector('#profile-name') as HTMLElement
        const countEl = el.querySelector('#profile-count') as HTMLElement
        const mapContainer = el.querySelector('#map-container') as HTMLElement
        const listEl = el.querySelector('#territory-list') as HTMLElement
        const nameInput = el.querySelector<HTMLInputElement>('#display-name-input')

        const visited = new Set<string>()
        const tooltip = document.createElement('div')
        tooltip.className = 'map-tooltip hidden'
        document.body.appendChild(tooltip)

        let mapView: MapView | null = null

        function highlightMap() {
            mapView?.highlight()
        }

        function renderBadges() {
            el.querySelector('#badge-list')!.innerHTML = computeBadgeCategories(
                visited,
                allTerritories,
            )
                .map(
                    (b) => `
              <li>
                <details class="badge-row ${b.earned ?? 'unearned'}">
                  <summary>
                    ${b.icon}
                    <span class="badge-name">${b.label}</span>
                    <span class="badge-count">${b.current} / ${b.target}</span>
                  </summary>
                  <p class="badge-more">
                    <b>${b.earned ? TIER_LABELS[b.earned] : 'Ekki unnið'}.</b>
                    ${b.current === b.target ? b.description : `Næsta stig: ${b.description}`}
                  </p>
                </details>
              </li>`,
                )
                .join('')
        }

        function renderList() {
            const visitedTerritories = allTerritories.filter((t) => visited.has(t.id))
            if (visitedTerritories.length === 0) {
                listEl.innerHTML = '<p class="muted">Engin lönd/svæði heimsótt enn.</p>'
                return
            }

            const byRegion = new Map<string, typeof territories>()
            for (const t of visitedTerritories) {
                const list = byRegion.get(t.region) ?? []
                list.push(t)
                byRegion.set(t.region, list)
            }

            listEl.innerHTML = ''
            byRegion.forEach((items, region) => {
                const group = document.createElement('div')
                group.className = 'list-group'
                group.innerHTML = `<div class="list-region">${regionLabel(region)} (${items.length})</div>`
                items.forEach((t) => {
                    const row = document.createElement('div')
                    row.className = 'list-row visited'
                    row.textContent = t.name
                    group.appendChild(row)
                })
                listEl.appendChild(group)
            })
        }

        // Load SVG (read-only)
        mapView = new MapView({ container: mapContainer, visited, tooltip, visitedOnly: true })
        mapView.load()

        const shipView = el.querySelector('#ship-view') as HTMLElement
        const sail = createSail()
        shipView.append(sail.el)
        let view: ShareKind = 'map'
        // Errors surface when the share button is tapped
        const prepareShare = () => isOwnProfile && prepareShareImage(visited, view).catch(() => {})
        el.querySelectorAll<HTMLButtonElement>('.view-tabs button').forEach((tab) =>
            tab.addEventListener('click', () => {
                view = tab.dataset.view as ShareKind
                el.querySelectorAll('.view-tabs button').forEach((t) =>
                    t.setAttribute('aria-pressed', String(t === tab)),
                )
                mapContainer.hidden = view !== 'map'
                shipView.hidden = view !== 'ship'
                prepareShare()
            }),
        )

        initNavHamburger(el)

        if (!isOwnProfile) {
            el.querySelector('#back-btn')!.addEventListener('click', () => history.back())
        }

        if (isOwnProfile) {
            const shareBtn = el.querySelector('#share-btn') as HTMLButtonElement
            shareBtn.addEventListener('click', async () => {
                shareBtn.disabled = true
                try {
                    await shareImage(visited, view)
                } catch (err) {
                    logError('share image', err)
                    alert('Tókst ekki að búa til mynd. Reyndu aftur.')
                } finally {
                    shareBtn.disabled = false
                }
            })
        }

        // Sign out
        if (isOwnProfile) {
            el.querySelector('#signout-btn')!.addEventListener('click', async () => {
                await supabase.auth.signOut({ scope: 'local' })
                history.pushState(null, '', '/')
                window.dispatchEvent(new PopStateEvent('popstate'))
            })
        }

        // Delete account (own profile only)
        if (isOwnProfile) {
            el.querySelector('#delete-account-btn')!.addEventListener('click', async () => {
                if (!confirm('Ertu viss? Þetta eyðir öllum ferðagögnum þínum og er óafturkræft.'))
                    return
                const deleteErrorEl = el.querySelector('#delete-error') as HTMLElement
                const { error } = await supabase.rpc('delete_my_account')
                if (error) {
                    deleteErrorEl.textContent = errorMessage('delete account', error)
                    return
                }
                await supabase.auth.signOut({ scope: 'local' })
                history.pushState(null, '', '/')
                window.dispatchEvent(new PopStateEvent('popstate'))
            })
        }

        if (isOwnProfile) {
            const currentEmailEl = el.querySelector('#current-email') as HTMLElement
            const pendingEmailEl = el.querySelector('#pending-email') as HTMLElement
            const emailForm = el.querySelector('#email-form') as HTMLFormElement
            const emailError = el.querySelector('#email-error') as HTMLElement
            const emailSuccess = el.querySelector('#email-success') as HTMLElement

            function showPendingEmail(newEmail: string | undefined) {
                pendingEmailEl.textContent = newEmail ? `Bíður staðfestingar: ${newEmail}` : ''
                pendingEmailEl.classList.toggle('hidden', !newEmail)
            }

            let accountEmail = currentUser.email ?? ''
            currentEmailEl.textContent = accountEmail
            showPendingEmail(currentUser.new_email)
            // The cached session user can be stale after an email change
            supabase.auth.getUser().then(({ data }) => {
                if (!data.user) return
                accountEmail = data.user.email ?? ''
                currentEmailEl.textContent = accountEmail
                showPendingEmail(data.user.new_email)
            })

            emailForm.addEventListener('submit', async (e) => {
                e.preventDefault()
                emailError.textContent = ''
                emailSuccess.textContent = ''
                const input = el.querySelector('#new-email') as HTMLInputElement
                const email = input.value.trim()
                if (email.toLowerCase() === accountEmail.toLowerCase()) {
                    emailError.textContent = 'Þetta er núverandi netfangið þitt.'
                    return
                }
                const { error } = await supabase.auth.updateUser(
                    { email },
                    { emailRedirectTo: `${window.location.origin}/profile/${currentUser.id}` },
                )
                // Look identical to success so the form can't reveal who has an account
                const taken =
                    error?.code === 'email_exists' || error?.code === 'user_already_exists'
                if (error && !taken) {
                    emailError.textContent = errorMessage('change email', error)
                    return
                }
                input.value = ''
                if (!taken) showPendingEmail(email)
                emailSuccess.textContent =
                    'Ef netfangið er ekki þegar í notkun hefur staðfestingarhlekkur verið sendur á það. Ef þú færð líka póst á núverandi netfang þarftu að staðfesta þar líka.'
            })

            const passwordForm = el.querySelector('#password-form') as HTMLFormElement
            const passwordError = el.querySelector('#password-error') as HTMLElement
            const passwordSuccess = el.querySelector('#password-success') as HTMLElement

            passwordForm.addEventListener('submit', async (e) => {
                e.preventDefault()
                passwordError.textContent = ''
                passwordSuccess.textContent = ''
                const current = (el.querySelector('#current-password') as HTMLInputElement).value
                const password = (el.querySelector('#new-password') as HTMLInputElement).value
                const confirmPw = (el.querySelector('#confirm-password') as HTMLInputElement).value

                if (password !== confirmPw) {
                    passwordError.textContent = 'Lykilorðin stemma ekki.'
                    return
                }

                // Guards against someone using an already-open session (e.g. an unlocked phone)
                const { error: verifyError } = await supabase.auth.signInWithPassword({
                    email: accountEmail,
                    password: current,
                })
                if (verifyError) {
                    passwordError.textContent =
                        verifyError.code === 'invalid_credentials'
                            ? 'Núverandi lykilorð er rangt.'
                            : errorMessage('verify password', verifyError)
                    return
                }

                const { error } = await supabase.auth.updateUser({ password })
                if (error) {
                    passwordError.textContent = errorMessage('change password', error)
                    return
                }
                passwordForm.reset()
                passwordSuccess.textContent = 'Lykilorðinu hefur verið breytt.'
            })

            const exportBtn = el.querySelector('#export-btn') as HTMLButtonElement
            const exportError = el.querySelector('#export-error') as HTMLElement
            exportBtn.addEventListener('click', async () => {
                exportError.textContent = ''
                exportBtn.disabled = true
                const error = await downloadVisitsCsv(currentUser.id)
                exportBtn.disabled = false
                if (error) exportError.textContent = errorMessage('export visits', error)
            })
        }

        // Edit display name (own profile only)
        if (isOwnProfile) {
            const nameField = nameInput!
            const nameForm = el.querySelector('#name-form') as HTMLFormElement
            const nameError = el.querySelector('#name-error') as HTMLElement
            const nameSuccess = el.querySelector('#name-success') as HTMLElement

            nameForm.addEventListener('submit', async (e) => {
                e.preventDefault()
                nameError.textContent = ''
                nameSuccess.textContent = ''
                const newName = nameField.value.trim()
                if (!newName) return
                const { error } = await supabase
                    .from('profiles')
                    .update({ display_name: newName })
                    .eq('id', currentUser.id)
                if (error) {
                    nameError.textContent = errorMessage('change name', error)
                    return
                }
                nameEl.textContent = newName
                nameField.value = newName
                nameSuccess.textContent = 'Nafninu hefur verið breytt.'
            })
        }

        // Load profile + visits
        Promise.all([
            supabase.from('profiles').select('display_name').eq('id', uid).single(),
            supabase.from('visits').select('country_code').eq('user_id', uid),
        ]).then(([{ data: profile }, { data: visits }]) => {
            nameEl.textContent = profile?.display_name ?? 'Óþekktur notandi'
            if (nameInput) nameInput.value = profile?.display_name ?? ''
            if (visits) visits.forEach((r) => visited.add(r.country_code))
            countEl.textContent = `${visited.size} / ${territories.length}`
            if (isOwnProfile) {
                el.querySelector('#share-btn')!.removeAttribute('disabled')
            }
            prepareShare()
            highlightMap()
            sail.update(visited)
            renderBadges()
            renderList()
        })

        return el
    },

    destroy() {
        document.querySelector('.map-tooltip')?.remove()
    },
}
