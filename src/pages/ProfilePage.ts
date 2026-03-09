import { supabase } from '../supabase'
import { authStore } from '../auth/authStore'
import { territories, svgToTerritories } from '../data/territories'
import { navigateTo } from '../router'

export const ProfilePage = {
  render(params: Record<string, string>): HTMLElement {
    const el = document.createElement('div')
    const currentUser = authStore.user!
    const uid = params['uid']
    const isOwnProfile = uid === currentUser.id

    el.innerHTML = `
      <nav class="navbar">
        <span class="nav-brand"><a href="/dashboard">Landnáma</a></span>
        <div class="nav-links">
          <a href="/leaderboards">Stigatöflur</a>
          ${isOwnProfile ? '<a href="/dashboard">Mitt kort</a>' : ''}
        </div>
      </nav>
      <div class="page-content">
        <div id="profile-header" class="page-header">
          <h1 id="profile-name">Loading…</h1>
          <span id="profile-count" class="count-badge"></span>
          ${isOwnProfile ? '<button id="edit-name-btn" class="btn-ghost">Breyta nafni</button>' : ''}
          ${isOwnProfile ? '<button id="signout-btn" class="btn-ghost btn-signout">Skrá út</button>' : ''}
        </div>
        ${isOwnProfile ? `
          <div id="edit-name-form" class="edit-name-form hidden">
            <input type="text" id="display-name-input" placeholder="Nafn (til birtingar)" maxlength="60" />
            <button id="save-name-btn" class="btn">Vista</button>
            <button id="cancel-name-btn" class="btn-ghost">Hætta við</button>
            <span id="edit-error" class="error"></span>
          </div>
        ` : ''}
        <div id="map-container" class="map-container profile-map">
          <div class="map-loading">Hleður korti…</div>
        </div>
        <div id="territory-list" class="profile-territory-list"></div>
      </div>
    `

    const nameEl = el.querySelector('#profile-name') as HTMLElement
    const countEl = el.querySelector('#profile-count') as HTMLElement
    const mapContainer = el.querySelector('#map-container') as HTMLElement
    const listEl = el.querySelector('#territory-list') as HTMLElement

    const visited = new Set<string>()
    let svgEl: SVGSVGElement | null = null
    const tooltip = document.createElement('div')
    tooltip.className = 'map-tooltip hidden'
    document.body.appendChild(tooltip)

    function highlightMap() {
      if (!svgEl) return
      svgEl.querySelectorAll<Element>('path[id], circle[id]').forEach(path => {
        const svgId = path.getAttribute('id')!
        const related = svgToTerritories.get(svgId) ?? []
        path.classList.toggle('visited', related.some(t => visited.has(t.id)))
      })
    }

    function renderList() {
      const visitedTerritories = territories.filter(t => visited.has(t.id))
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
        items.forEach(t => {
          const row = document.createElement('div')
          row.className = 'list-row visited'
          row.textContent = t.name
          group.appendChild(row)
        })
        listEl.appendChild(group)
      })
    }

    // Load SVG (read-only, no click handlers)
    fetch('/world.svg')
      .then(r => r.text())
      .then(svgText => {
        mapContainer.innerHTML = svgText
        svgEl = mapContainer.querySelector('svg')!
        svgEl.setAttribute('width', '100%')
        svgEl.setAttribute('height', '100%')

        svgEl.querySelectorAll<Element>('path[id], circle[id]').forEach(path => {
          const svgId = path.getAttribute('id')!
          if (!svgToTerritories.has(svgId)) return
          ;(path as HTMLElement).style.cursor = 'default'
          path.addEventListener('mousemove', (e) => {
            const options = svgToTerritories.get(svgId) ?? []
            const me = e as MouseEvent
            const visitedHere = options.filter(t => visited.has(t.id))
            if (visitedHere.length === 0) return
            tooltip.textContent = visitedHere.map(t => t.name).join(', ')
            tooltip.classList.remove('hidden')
            tooltip.style.left = `${me.clientX + 12}px`
            tooltip.style.top = `${me.clientY - 28}px`
          })
          path.addEventListener('mouseleave', () => tooltip.classList.add('hidden'))
        })

        highlightMap()
      })

    // Sign out
    if (isOwnProfile) {
      el.querySelector('#signout-btn')!.addEventListener('click', async () => {
        await supabase.auth.signOut()
        navigateTo('/')
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
      if (visits) visits.forEach(r => visited.add(r.country_code))
      countEl.textContent = `${visited.size} / ${territories.length}`
      highlightMap()
      renderList()
    })

    return el
  },

  destroy() {
    document.querySelector('.map-tooltip')?.remove()
  },
}
