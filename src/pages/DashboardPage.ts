import { supabase } from '../supabase'
import { authStore } from '../auth/authStore'
import { territories, svgToTerritories } from '../data/territories'

export const DashboardPage = {
  render(_params: Record<string, string>): HTMLElement {
    const el = document.createElement('div')
    el.className = 'dashboard'

    const user = authStore.user!
    const visited = new Set<string>()
    let activePickerSvgId: string | null = null

    el.innerHTML = `
      <nav class="navbar">
        <span class="nav-brand">Landnáma</span>
        <div class="nav-links">
          <a href="/leaderboards">Stigatöflur</a>
          <a href="/profile/${user.id}">Prófíll</a>
          <a href="/um">Um</a>
        </div>
        <button class="nav-hamburger" id="nav-hamburger" aria-label="Valmynd">&#9776;</button>
        <div class="nav-mobile-menu hidden" id="nav-mobile-menu">
          <a href="/leaderboards">Stigatöflur</a>
          <a href="/profile/${user.id}">Prófíll</a>
          <a href="/um">Um</a>
        </div>
      </nav>
      <div class="mobile-tabs">
        <button class="mobile-tab active" data-tab="map">Kort</button>
        <button class="mobile-tab" data-tab="list">Listi</button>
        <button class="mobile-tab" data-tab="stats">Tölfræði</button>
        <span id="count-mobile" class="count-badge">0 / ${territories.length}</span>
      </div>
      <div class="dashboard-body">
        <aside class="sidebar">
          <div class="sidebar-header">
            <span id="count" class="count-badge">0 / ${territories.length}</span>
            <input id="search" type="search" placeholder="Leita að löndum/svæðum…" />
            <select id="region-filter">
              <option value="">Öll svæði</option>
              <option>Africa</option>
              <option>Antarctica</option>
              <option>Asia</option>
              <option>Atlantic Ocean</option>
              <option>Caribbean</option>
              <option>Central America</option>
              <option>Europe & Mediterranean</option>
              <option>Indian Ocean</option>
              <option>Middle East</option>
              <option>North America</option>
              <option>Pacific Ocean</option>
              <option>South America</option>
            </select>
          </div>
          <div id="territory-list" class="territory-list"></div>
        </aside>
        <div class="map-column">
          <main class="map-area">
            <div id="map-container" class="map-container">
              <div class="map-loading">Hleður korti…</div>
            </div>
            <div id="picker" class="picker hidden"></div>
            <div id="tooltip" class="map-tooltip hidden"></div>
          </main>
          <div id="stats" class="stats-panel"></div>
        </div>
      </div>
    `

    const hamburger = el.querySelector('#nav-hamburger') as HTMLButtonElement
    const mobileMenu = el.querySelector('#nav-mobile-menu') as HTMLElement
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation()
      mobileMenu.classList.toggle('hidden')
    })
    document.addEventListener('click', () => mobileMenu.classList.add('hidden'))

    // Mobile tab switching
    const dashBody = el.querySelector('.dashboard-body') as HTMLElement
    el.querySelectorAll('.mobile-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.mobile-tab').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        dashBody.dataset.tab = (btn as HTMLElement).dataset.tab
      })
    })

    const countEl = el.querySelector('#count') as HTMLElement
    const countMobileEl = el.querySelector('#count-mobile') as HTMLElement
    const mapContainer = el.querySelector('#map-container') as HTMLElement
    const tooltip = el.querySelector('#tooltip') as HTMLElement
    const picker = el.querySelector('#picker') as HTMLElement
    const searchInput = el.querySelector('#search') as HTMLInputElement
    const regionSelect = el.querySelector('#region-filter') as HTMLSelectElement
    const listEl = el.querySelector('#territory-list') as HTMLElement

    let svgEl: SVGSVGElement | null = null

    function updateCount() {
      const text = `${visited.size} / ${territories.length}`
      countEl.textContent = text
      countMobileEl.textContent = text
    }

    const REGION_TOTALS: Record<string, number> = {
      'Africa': 55,
      'Antarctica': 7,
      'Asia': 52,
      'Atlantic Ocean': 14,
      'Caribbean': 31,
      'Central America': 7,
      'Europe & Mediterranean': 68,
      'Indian Ocean': 15,
      'Middle East': 21,
      'North America': 6,
      'Pacific Ocean': 40,
      'South America': 14,
    }

    function donutSvg(pct: number, size: number, strokeWidth: number, color = '#3b82f6'): string {
      const cx = size / 2
      const cy = size / 2
      const r = (size - strokeWidth) / 2
      const circumference = 2 * Math.PI * r
      const filled = (pct / 100) * circumference
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#2e3347" stroke-width="${strokeWidth}"/>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"
            stroke-dasharray="${filled.toFixed(2)} ${circumference.toFixed(2)}"
            transform="rotate(-90 ${cx} ${cy})"
            stroke-linecap="round"
          />
          <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"
            fill="${color}" font-size="${Math.round(size * 0.22)}px" font-weight="700" font-family="system-ui,sans-serif">
            ${pct}%
          </text>
        </svg>
      `
    }

    function renderStats() {
      const statsEl = el.querySelector('#stats') as HTMLElement

      const byRegion: Record<string, number> = {}
      for (const id of visited) {
        const t = territories.find(t => t.id === id)
        if (t) byRegion[t.region] = (byRegion[t.region] ?? 0) + 1
      }

      const pct = Math.round((visited.size / territories.length) * 100)

      statsEl.innerHTML = `
        <div class="stats-row">
          <div class="stats-donut-card stats-donut-total">
            ${donutSvg(pct, 84, 11, '#e8e8e8')}
            <div class="stats-donut-name">Samtals</div>
            <div class="stats-donut-count">${visited.size}/${territories.length}</div>
          </div>
          ${Object.entries(REGION_TOTALS).map(([region, total]) => {
            const count = byRegion[region] ?? 0
            const rpct = Math.round((count / total) * 100)
            return `
              <div class="stats-donut-card">
                ${donutSvg(rpct, 72, 9)}
                <div class="stats-donut-name">${region}</div>
                <div class="stats-donut-count">${count}/${total}</div>
              </div>
            `
          }).join('')}
        </div>
      `
    }

    function highlightMap() {
      if (!svgEl) return
      svgEl.querySelectorAll<Element>('path[id], circle[id]').forEach(path => {
        const svgId = path.getAttribute('id')!
        const relatedTerritories = svgToTerritories.get(svgId) ?? []
        const anyVisited = relatedTerritories.some(t => visited.has(t.id))
        path.classList.toggle('visited', anyVisited)
      })
    }

    function renderList(filter = '', region = '') {
      const lower = filter.toLowerCase()
      const filtered = territories.filter(t =>
        (!region || t.region === region) &&
        (!lower || t.name.toLowerCase().includes(lower))
      )

      // Group by region
      const byRegion = new Map<string, typeof territories>()
      for (const t of filtered) {
        const list = byRegion.get(t.region) ?? []
        list.push(t)
        byRegion.set(t.region, list)
      }

      listEl.innerHTML = ''
      byRegion.forEach((items, region) => {
        const group = document.createElement('div')
        group.className = 'list-group'
        group.innerHTML = `<div class="list-region">${region}</div>`
        items.forEach(t => {
          const row = document.createElement('div')
          row.className = `list-row${visited.has(t.id) ? ' visited' : ''}`
          row.dataset.id = t.id
          row.textContent = t.name
          row.addEventListener('click', () => toggleVisit(t.id, row))
          group.appendChild(row)
        })
        listEl.appendChild(group)
      })
    }

    async function toggleVisit(id: string, rowEl?: Element) {
      const wasVisited = visited.has(id)
      if (wasVisited) {
        visited.delete(id)
        rowEl?.classList.remove('visited')
        const { error } = await supabase.from('visits').delete().eq('user_id', user.id).eq('country_code', id)
        if (error) console.error('delete error:', error)
      } else {
        visited.add(id)
        rowEl?.classList.add('visited')
        const { error } = await supabase.from('visits').insert({ user_id: user.id, country_code: id })
        if (error) console.error('insert error:', error)
      }
      highlightMap()
      updateCount()
      renderStats()
    }

    function showPicker(svgId: string, x: number, y: number) {
      const options = svgToTerritories.get(svgId) ?? []
      if (options.length === 0) return

      if (options.length === 1) {
        const row = listEl.querySelector(`[data-id="${options[0].id}"]`) ?? undefined
        toggleVisit(options[0].id, row)
        return
      }

      activePickerSvgId = svgId
      picker.innerHTML = `
        <div class="picker-title">Veldu svæði</div>
        ${options.map(t => `
          <div class="picker-option${visited.has(t.id) ? ' visited' : ''}" data-id="${t.id}">
            <span class="picker-check">${visited.has(t.id) ? '✓' : ''}</span>
            ${t.name}
          </div>
        `).join('')}
      `
      picker.classList.remove('hidden')
      // Position near click, keep on screen
      const maxX = window.innerWidth - 220
      const maxY = window.innerHeight - picker.offsetHeight - 20
      picker.style.left = `${Math.min(x, maxX)}px`
      picker.style.top = `${Math.min(y, maxY)}px`

      picker.querySelectorAll('.picker-option').forEach(opt => {
        opt.addEventListener('click', async () => {
          const id = (opt as HTMLElement).dataset.id!
          const row = listEl.querySelector(`[data-id="${id}"]`) ?? undefined
          await toggleVisit(id, row)
          // refresh picker
          const isNowVisited = visited.has(id)
          opt.classList.toggle('visited', isNowVisited)
          opt.querySelector('.picker-check')!.textContent = isNowVisited ? '✓' : ''
        })
      })
    }

    // Close picker on outside click
    document.addEventListener('click', (e) => {
      if (activePickerSvgId && !picker.contains(e.target as Node)) {
        picker.classList.add('hidden')
        activePickerSvgId = null
      }
    }, { capture: true })

    // Search + filter
    const rerender = () => renderList(searchInput.value, regionSelect.value)
    searchInput.addEventListener('input', rerender)
    regionSelect.addEventListener('change', rerender)

    // Load SVG
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

          path.addEventListener('click', (e) => {
            e.stopPropagation()
            const me = e as MouseEvent
            showPicker(svgId, me.clientX, me.clientY)
          })

          path.addEventListener('mousemove', (e) => {
            const options = svgToTerritories.get(svgId) ?? []
            const me = e as MouseEvent
            tooltip.textContent = options.length === 1
              ? options[0].name
              : options.map(t => t.name).join(' / ')
            tooltip.classList.remove('hidden')
            tooltip.style.left = `${me.clientX + 12}px`
            tooltip.style.top = `${me.clientY - 28}px`
          })

          path.addEventListener('mouseleave', () => tooltip.classList.add('hidden'))
        })

        highlightMap()
      })

    // Fetch visits
    supabase
      .from('visits')
      .select('country_code')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) console.error('fetch visits error:', error)
        const validIds = new Set(territories.map(t => t.id))
        if (data) data.forEach(r => { if (validIds.has(r.country_code)) visited.add(r.country_code) })
        highlightMap()
        updateCount()
        renderList()
        renderStats()
      })

    renderList()
    return el
  },
}
