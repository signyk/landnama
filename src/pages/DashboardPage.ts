import { supabase } from '../supabase'
import { logError } from '../errorLog'
import { authStore } from '../auth/authStore'
import {
    territories,
    retiredTerritories,
    svgToTerritories,
    territoryMap,
} from '../data/territories'
import { navbar, initNavHamburger } from '../components/nav'
import { MapView } from '../components/MapView'
import { createDropdown } from '../components/Dropdown'
import { createSail } from '../components/ship'
import { REGION_ORDER, regionLabel } from '../badges'

export const DashboardPage = {
    render(_params: Record<string, string>): HTMLElement {
        const el = document.createElement('div')
        el.className = 'dashboard'

        const user = authStore.user!
        const visited = new Set<string>()
        let activePickerSvgId: string | null = null

        el.innerHTML = `
      ${navbar('home', user.id)}
      <h1 class="sr-only">Heim</h1>
      <div class="dashboard-body">
        <aside class="sidebar">
          <div class="sidebar-header">
            <div class="search-wrap">
              <input id="search" type="search" placeholder="Leita að löndum/svæðum…" />
              <button id="search-clear" class="search-clear hidden" type="button" aria-label="Hreinsa leit">×</button>
            </div>
            <div id="region-dropdown-mount"></div>
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
        </div>
      </div>
      <div id="toast" class="toast hidden" role="alert"></div>
      <button type="button" id="to-top" class="to-top" aria-label="Aftur efst">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
      </button>
    `

        initNavHamburger(el)

        const mapContainer = el.querySelector('#map-container') as HTMLElement
        const tooltip = el.querySelector('#tooltip') as HTMLElement
        const picker = el.querySelector('#picker') as HTMLElement
        const toast = el.querySelector('#toast') as HTMLElement
        const searchInput = el.querySelector('#search') as HTMLInputElement
        const searchClear = el.querySelector('#search-clear') as HTMLButtonElement
        const listEl = el.querySelector('#territory-list') as HTMLElement

        const regionDropdown = createDropdown({
            options: [
                { label: 'Öll svæði', value: '' },
                ...REGION_ORDER.map((r) => ({ label: regionLabel(r), value: r })),
            ],
            onChange: (value) => {
                sail.pin(value || null)
                rerender()
            },
        })
        el.querySelector('#region-dropdown-mount')!.replaceWith(regionDropdown.el)

        const sail = createSail((region) => {
            regionDropdown.setValue(region ?? '')
            searchInput.value = ''
            rerender()
        })
        el.querySelector('.sidebar')!.prepend(sail.el)

        let mapView: MapView | null = null

        function highlightMap() {
            mapView?.highlight()
        }

        function renderList(filter = '', region = '') {
            const lower = filter.toLowerCase()
            const filtered = territories.filter(
                (t) =>
                    (!region || t.region === region) &&
                    (!lower || t.name.toLowerCase().includes(lower)),
            )

            // Group by region
            const byRegion = new Map<string, typeof territories>()
            for (const t of filtered) {
                const list = byRegion.get(t.region) ?? []
                list.push(t)
                byRegion.set(t.region, list)
            }

            const makeRow = (t: (typeof territories)[0]) => {
                const row = document.createElement('div')
                row.className = `list-row${visited.has(t.id) ? ' visited' : ''}`
                row.dataset.id = t.id
                row.textContent = t.name
                row.addEventListener('click', () => toggleVisit(t.id, row))
                return row
            }

            listEl.innerHTML = ''
            byRegion.forEach((items, region) => {
                const group = document.createElement('div')
                group.className = 'list-group'
                group.innerHTML = `<div class="list-region">${regionLabel(region)}</div>`
                items.forEach((t) => group.appendChild(makeRow(t)))
                listEl.appendChild(group)
            })

            {
                const filteredRetired = retiredTerritories.filter(
                    (t) =>
                        (!region || t.region === region) &&
                        (!lower || t.name.toLowerCase().includes(lower)),
                )
                if (filteredRetired.length > 0) {
                    const separator = document.createElement('div')
                    separator.className = 'list-retired-header'
                    separator.textContent = 'Fyrrum svæði'
                    listEl.appendChild(separator)

                    const byRegionRetired = new Map<string, typeof retiredTerritories>()
                    for (const t of filteredRetired) {
                        const list = byRegionRetired.get(t.region) ?? []
                        list.push(t)
                        byRegionRetired.set(t.region, list)
                    }
                    byRegionRetired.forEach((items, region) => {
                        const group = document.createElement('div')
                        group.className = 'list-group'
                        group.innerHTML = `<div class="list-region">${regionLabel(region)}</div>`
                        items.forEach((t) => group.appendChild(makeRow(t)))
                        listEl.appendChild(group)
                    })
                }
            }
        }

        // Territories with a save in flight; extra clicks are ignored until it settles
        const pending = new Set<string>()
        let visitsLoaded = false

        function refreshVisitUi(id: string) {
            listEl.querySelector(`[data-id="${id}"]`)?.classList.toggle('visited', visited.has(id))
            highlightMap()
            sail.update(visited)
        }

        async function toggleVisit(id: string, rowEl?: Element) {
            if (!visitsLoaded || pending.has(id)) return
            pending.add(id)

            const wasVisited = visited.has(id)
            // Optimistic update
            if (wasVisited) visited.delete(id)
            else visited.add(id)
            rowEl?.classList.toggle('visited', !wasVisited)
            refreshVisitUi(id)

            let error: unknown = null
            try {
                const res = wasVisited
                    ? await supabase
                          .from('visits')
                          .delete()
                          .eq('user_id', user.id)
                          .eq('country_code', id)
                    : await supabase.from('visits').insert({ user_id: user.id, country_code: id })
                error = res.error
            } catch (e) {
                error = e
            }

            if (error) {
                logError('toggle visit', error)
                // Roll back so the UI matches the database
                if (wasVisited) visited.add(id)
                else visited.delete(id)
                rowEl?.classList.toggle('visited', wasVisited)
                refreshVisitUi(id)
                showToast('Ekki tókst að vista. Reyndu aftur.')
            }
            pending.delete(id)
        }

        let toastTimer: number | undefined
        function showToast(message: string) {
            toast.textContent = message
            toast.classList.remove('hidden')
            window.clearTimeout(toastTimer)
            toastTimer = window.setTimeout(() => toast.classList.add('hidden'), 4000)
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
        ${options
            .map(
                (t) => `
          <div class="picker-option${visited.has(t.id) ? ' visited' : ''}" data-id="${t.id}">
            <span class="picker-check" aria-hidden="true"></span>
            ${t.name}
          </div>
        `,
            )
            .join('')}
      `
            picker.classList.remove('hidden')
            // Position near click, keep on screen
            const maxX = window.innerWidth - 220
            const maxY = window.innerHeight - picker.offsetHeight - 20
            picker.style.left = `${Math.min(x, maxX)}px`
            picker.style.top = `${Math.min(y, maxY)}px`

            picker.querySelectorAll('.picker-option').forEach((opt) => {
                opt.addEventListener('click', async () => {
                    const id = (opt as HTMLElement).dataset.id!
                    const row = listEl.querySelector(`[data-id="${id}"]`) ?? undefined
                    await toggleVisit(id, row)
                    opt.classList.toggle('visited', visited.has(id))
                })
            })
        }

        // Close picker on outside click
        document.addEventListener(
            'click',
            (e) => {
                if (activePickerSvgId && !picker.contains(e.target as Node)) {
                    picker.classList.add('hidden')
                    activePickerSvgId = null
                }
            },
            { capture: true },
        )

        // Search + filter
        const rerender = () => {
            searchClear.classList.toggle('hidden', searchInput.value === '')
            renderList(searchInput.value, regionDropdown.getValue())
        }
        searchInput.addEventListener('input', rerender)
        searchClear.addEventListener('click', () => {
            searchInput.value = ''
            searchInput.focus()
            rerender()
        })

        // The map is hidden on narrow screens, so don't download it there
        const narrow = window.matchMedia('(max-width: 900px)')
        const loadMap = () => {
            if (mapView || narrow.matches) return
            mapView = new MapView({
                container: mapContainer,
                visited,
                tooltip,
                onPathClick: (svgId, x, y) => showPicker(svgId, x, y),
                zoomable: true,
            })
            mapView.load()
        }
        loadMap()
        narrow.addEventListener('change', loadMap)

        const toTop = el.querySelector('#to-top') as HTMLButtonElement
        const onScroll = () => {
            if (!el.isConnected) return window.removeEventListener('scroll', onScroll)
            toTop.classList.toggle('visible', window.scrollY > 600)
        }
        window.addEventListener('scroll', onScroll, { passive: true })
        toTop.addEventListener('click', () => {
            const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
            window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' })
        })

        async function loadVisits() {
            toast.classList.add('hidden')
            const { data, error } = await supabase
                .from('visits')
                .select('country_code')
                .eq('user_id', user.id)

            if (error || !data) {
                logError('fetch visits', error)
                window.clearTimeout(toastTimer)
                toast.innerHTML = `Ekki tókst að sækja heimsóknirnar þínar.
                    <button type="button" class="toast-retry">Reyna aftur</button>`
                toast.querySelector('.toast-retry')!.addEventListener('click', loadVisits)
                toast.classList.remove('hidden')
                return
            }

            const validIds = new Set(territoryMap.keys())
            visited.clear()
            data.forEach((r) => {
                if (validIds.has(r.country_code)) visited.add(r.country_code)
            })
            visitsLoaded = true
            highlightMap()
            renderList()
            sail.update(visited)
        }
        void loadVisits()

        renderList()
        return el
    },
}
