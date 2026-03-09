import { svgToTerritories } from '../data/territories'

export interface MapViewOptions {
  container: HTMLElement
  visited: Set<string>
  tooltip: HTMLElement
  /** Called when a map path is clicked. Omit for read-only maps. */
  onPathClick?: (svgId: string, x: number, y: number) => void
  /** Only show tooltip for visited territories (profile mode) */
  visitedOnly?: boolean
  /** Enable zoom + pan */
  zoomable?: boolean
}

export class MapView {
  private svgEl: SVGSVGElement | null = null
  private opts: MapViewOptions

  constructor(opts: MapViewOptions) {
    this.opts = opts
  }

  /** Load the SVG and set up interactions. Returns a promise that resolves when ready. */
  load(): Promise<void> {
    return fetch('/world.svg')
      .then(r => r.text())
      .then(svgText => {
        const { container, visited, tooltip, onPathClick, visitedOnly, zoomable } = this.opts
        container.innerHTML = svgText
        const svgEl = container.querySelector('svg')!
        svgEl.setAttribute('width', '100%')
        svgEl.setAttribute('height', '100%')
        this.svgEl = svgEl

        svgEl.querySelectorAll<Element>('path[id], circle[id]').forEach(path => {
          const svgId = path.getAttribute('id')!
          if (!svgToTerritories.has(svgId)) return

          if (!onPathClick) {
            (path as HTMLElement).style.cursor = 'default'
          } else {
            path.addEventListener('click', (e) => {
              e.stopPropagation()
              const me = e as MouseEvent
              onPathClick(svgId, me.clientX, me.clientY)
            })
          }

          path.addEventListener('mousemove', (e) => {
            const options = svgToTerritories.get(svgId) ?? []
            const me = e as MouseEvent
            const relevant = visitedOnly ? options.filter(t => visited.has(t.id)) : options
            if (relevant.length === 0) return
            tooltip.textContent = relevant.map(t => t.name).join(visitedOnly ? ', ' : ' / ')
            tooltip.classList.remove('hidden')
            tooltip.style.left = `${me.clientX + 12}px`
            tooltip.style.top = `${me.clientY - 28}px`
          })

          path.addEventListener('mouseleave', () => tooltip.classList.add('hidden'))
        })

        this.highlight()

        if (zoomable) this._initZoom(svgEl)
      })
  }

  highlight(): void {
    if (!this.svgEl) return
    const { visited } = this.opts
    this.svgEl.querySelectorAll<Element>('path[id], circle[id]').forEach(path => {
      const svgId = path.getAttribute('id')!
      const related = svgToTerritories.get(svgId) ?? []
      path.classList.toggle('visited', related.some(t => visited.has(t.id)))
    })
  }

  private _initZoom(svgEl: SVGSVGElement): void {
    const ob = svgEl.viewBox.baseVal
    const orig = { x: ob.x, y: ob.y, w: ob.width, h: ob.height }
    let vx = orig.x, vy = orig.y, vw = orig.w, vh = orig.h

    const applyVB = () => svgEl.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`)

    svgEl.addEventListener('wheel', (e) => {
      e.preventDefault()
      const rect = svgEl.getBoundingClientRect()
      const mx = (e.clientX - rect.left) / rect.width
      const my = (e.clientY - rect.top) / rect.height
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      const newVw = Math.min(orig.w, vw / factor)
      const newVh = Math.min(orig.h, vh / factor)
      if (newVw >= orig.w) {
        vx = orig.x; vy = orig.y; vw = orig.w; vh = orig.h
        applyVB(); return
      }
      vx += mx * (vw - newVw)
      vy += my * (vh - newVh)
      vw = newVw; vh = newVh
      applyVB()
    }, { passive: false })

    let panX = 0, panY = 0, isPanning = false, hasPanned = false
    svgEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      isPanning = true; hasPanned = false
      panX = e.clientX; panY = e.clientY
    })
    window.addEventListener('pointermove', (e) => {
      if (!isPanning) return
      const dx = e.clientX - panX
      const dy = e.clientY - panY
      if (!hasPanned && Math.hypot(dx, dy) < 4) return
      hasPanned = true
      svgEl.style.cursor = 'grabbing'
      const rect = svgEl.getBoundingClientRect()
      vx -= dx / rect.width * vw
      vy -= dy / rect.height * vh
      panX = e.clientX; panY = e.clientY
      applyVB()
    })
    window.addEventListener('pointerup', () => {
      if (hasPanned) {
        window.addEventListener('click', e => e.stopPropagation(), { capture: true, once: true })
      }
      isPanning = false
      svgEl.style.cursor = ''
    })

    svgEl.addEventListener('dblclick', (e) => {
      e.stopPropagation()
      vx = orig.x; vy = orig.y; vw = orig.w; vh = orig.h
      applyVB()
    })
  }
}
