import { supabase } from '../supabase'
import { authStore } from '../auth/authStore'
import { territories, allTerritories } from '../data/territories'
import { navbar, initNavHamburger } from '../components/nav'
import { MapView } from '../components/MapView'
import { computeBadgeCategories } from '../badges'
import type { BadgeLevel } from '../badges'

export const ProfilePage = {
    render(params: Record<string, string>): HTMLElement {
        const el = document.createElement('div')
        const currentUser = authStore.user!
        const uid = params['uid']
        const isOwnProfile = uid === currentUser.id

        el.innerHTML = `
      ${navbar(isOwnProfile ? 'profile' : null, currentUser.id)}
      <div class="page-content">
        <div id="profile-header" class="page-header">
          ${!isOwnProfile ? '<button id="back-btn" class="back-link">← Til baka</button>' : ''}
          <h1 id="profile-name">Loading…</h1>
          <span id="profile-count" class="count-badge"></span>
          ${isOwnProfile ? '<button id="edit-name-btn" class="btn-ghost">Breyta nafni</button>' : ''}
          ${isOwnProfile ? '<button id="signout-btn" class="btn-ghost btn-signout">Skrá út</button>' : ''}
        </div>
        ${
            isOwnProfile
                ? `
          <div id="edit-name-form" class="edit-name-form hidden">
            <input type="text" id="display-name-input" placeholder="Nafn (til birtingar)" maxlength="60" />
            <button id="save-name-btn" class="btn">Vista</button>
            <button id="cancel-name-btn" class="btn-ghost">Hætta við</button>
            <span id="edit-error" class="error"></span>
          </div>
        `
                : ''
        }
        <div id="map-container" class="map-container profile-map">
          <div class="map-loading">Hleður korti…</div>
        </div>
        <div id="badges-section" class="badges-section">
          <h2 class="section-title">Merki</h2>
          <div id="badge-grid" class="badge-grid"></div>
        </div>
        <div id="territory-list" class="profile-territory-list"></div>
        ${
            isOwnProfile
                ? `
        <div class="danger-section" style="margin-top:2rem">
          <h3 style="margin-bottom:0.5rem">Eyða aðgangi</h3>
          <p class="muted" style="margin-bottom:0.75rem">Þetta eyðir öllum ferðagögnum þínum og er óafturkræft.</p>
          <button id="delete-account-btn" class="btn-danger">Eyða aðgangi</button>
          <span id="delete-error" class="error"></span>
        </div>
        `
                : ''
        }
      </div>
    `

        const nameEl = el.querySelector('#profile-name') as HTMLElement
        const countEl = el.querySelector('#profile-count') as HTMLElement
        const mapContainer = el.querySelector('#map-container') as HTMLElement
        const listEl = el.querySelector('#territory-list') as HTMLElement

        const visited = new Set<string>()
        const tooltip = document.createElement('div')
        tooltip.className = 'map-tooltip hidden'
        document.body.appendChild(tooltip)

        let mapView: MapView | null = null

        function highlightMap() {
            mapView?.highlight()
        }

        const TIER_LABELS: Record<BadgeLevel, string> = {
            bronze: 'Brons',
            silver: 'Silfur',
            gold: 'Gull',
            platinum: 'Platína',
            diamond: 'Demantur',
        }

        let activePopover: HTMLElement | null = null

        function closePopover() {
            activePopover?.remove()
            activePopover = null
            document.removeEventListener('click', closePopover)
        }

        function renderBadges() {
            const grid = el.querySelector('#badge-grid') as HTMLElement
            grid.innerHTML = ''
            const categories = computeBadgeCategories(visited, allTerritories)

            for (const cat of categories) {
                const levelClass = cat.earned ? `badge-level-${cat.earned}` : 'badge-level-unearned'
                const btn = document.createElement('button')
                btn.className = `badge-icon-btn ${levelClass}`
                btn.innerHTML = cat.icon
                btn.setAttribute('aria-label', cat.label)

                btn.addEventListener('click', (e) => {
                    e.stopPropagation()
                    if (activePopover?.dataset.badgeId === cat.id) {
                        closePopover()
                        return
                    }
                    closePopover()

                    const popover = document.createElement('div')
                    popover.className = `badge-popover ${levelClass}`
                    popover.dataset.badgeId = cat.id

                    const tierHtml = cat.earned
                        ? `<span class="badge-popover-tier badge-tier-${cat.earned}">${TIER_LABELS[cat.earned]}</span>`
                        : `<span class="badge-popover-tier badge-tier-unearned">Ekki unnið</span>`

                    const pct = Math.round(cat.progress * 100)
                    popover.innerHTML = `
                        <div class="badge-popover-header">
                            <span class="badge-popover-label">${cat.label}</span>
                            ${tierHtml}
                        </div>
                        <p class="badge-popover-desc">${cat.description}</p>
                        <div class="badge-popover-progress-wrap">
                            <div class="badge-popover-progress-track">
                                <div class="badge-popover-progress-fill" style="width:${pct}%"></div>
                            </div>
                            <span class="badge-popover-progress-detail">${cat.progressDetail}</span>
                        </div>
                    `

                    document.body.appendChild(popover)
                    activePopover = popover

                    // Position above the button, clamped to viewport
                    const rect = btn.getBoundingClientRect()
                    const popoverWidth = 220
                    const gap = 8
                    let left = rect.left + rect.width / 2 - popoverWidth / 2
                    left = Math.max(gap, Math.min(left, window.innerWidth - popoverWidth - gap))
                    popover.style.left = `${left}px`
                    popover.style.top = `${rect.top - popover.offsetHeight - gap}px`

                    document.addEventListener('click', closePopover)
                })

                grid.appendChild(btn)
            }
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
                group.innerHTML = `<div class="list-region">${region} (${items.length})</div>`
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

        initNavHamburger(el)

        if (!isOwnProfile) {
            el.querySelector('#back-btn')!.addEventListener('click', () => history.back())
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
                    deleteErrorEl.textContent = error.message
                    return
                }
                await supabase.auth.signOut({ scope: 'local' })
                history.pushState(null, '', '/')
                window.dispatchEvent(new PopStateEvent('popstate'))
            })
        }

        // Edit display name (own profile only)
        if (isOwnProfile) {
            const editBtn = el.querySelector('#edit-name-btn')!
            const editForm = el.querySelector('#edit-name-form') as HTMLElement
            const nameInput = el.querySelector('#display-name-input') as HTMLInputElement
            const saveBtn = el.querySelector('#save-name-btn')!
            const cancelBtn = el.querySelector('#cancel-name-btn')!
            const editError = el.querySelector('#edit-error') as HTMLElement

            editBtn.addEventListener('click', () => {
                nameInput.value = nameEl.textContent ?? ''
                editForm.classList.remove('hidden')
                nameInput.focus()
            })

            cancelBtn.addEventListener('click', () => {
                editForm.classList.add('hidden')
                editError.textContent = ''
            })

            saveBtn.addEventListener('click', async () => {
                const newName = nameInput.value.trim()
                if (!newName) return
                const { error } = await supabase
                    .from('profiles')
                    .update({ display_name: newName })
                    .eq('id', currentUser.id)
                if (error) {
                    editError.textContent = error.message
                } else {
                    nameEl.textContent = newName
                    editForm.classList.add('hidden')
                    editError.textContent = ''
                }
            })
        }

        // Load profile + visits
        Promise.all([
            supabase.from('profiles').select('display_name').eq('id', uid).single(),
            supabase.from('visits').select('country_code').eq('user_id', uid),
        ]).then(([{ data: profile }, { data: visits }]) => {
            nameEl.textContent = profile?.display_name ?? 'Unknown user'
            if (visits) visits.forEach((r) => visited.add(r.country_code))
            countEl.textContent = `${visited.size} / ${territories.length}`
            highlightMap()
            renderBadges()
            renderList()
        })

        return el
    },

    destroy() {
        document.querySelector('.map-tooltip')?.remove()
    },
}
