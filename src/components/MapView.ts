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
            .then((r) => r.text())
            .then((svgText) => {
                const { container, visited, tooltip, onPathClick, visitedOnly, zoomable } =
                    this.opts
                container.innerHTML = svgText
                const svgEl = container.querySelector('svg')!
                svgEl.setAttribute('width', '100%')
                svgEl.setAttribute('height', '100%')
                this.svgEl = svgEl

                svgEl.querySelectorAll<Element>('path[id], circle[id]').forEach((path) => {
                    const svgId = path.getAttribute('id')!
                    if (!svgToTerritories.has(svgId)) return

                    if (!onPathClick) {
                        ;(path as HTMLElement).style.cursor = 'default'
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
                        const relevant = visitedOnly
                            ? options.filter((t) => visited.has(t.id))
                            : options
                        if (relevant.length === 0) return
                        tooltip.textContent = relevant
                            .map((t) => t.name)
                            .join(visitedOnly ? ', ' : ' / ')
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
        this.svgEl.querySelectorAll<Element>('path[id], circle[id]').forEach((path) => {
            const svgId = path.getAttribute('id')!
            const related = svgToTerritories.get(svgId) ?? []
            path.classList.toggle(
                'visited',
                related.some((t) => visited.has(t.id)),
            )
        })
    }

    private _initZoom(svgEl: SVGSVGElement): void {
        const ob = svgEl.viewBox.baseVal
        const orig = { x: ob.x, y: ob.y, w: ob.width, h: ob.height }
        let vx = orig.x,
            vy = orig.y,
            vw = orig.w,
            vh = orig.h

        // Prevent browser from handling pan/pinch on this element
        svgEl.style.touchAction = 'none'

        const applyVB = () => svgEl.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`)

        const zoomAround = (mx: number, my: number, factor: number) => {
            const newVw = Math.min(orig.w, vw / factor)
            const newVh = Math.min(orig.h, vh / factor)
            if (newVw >= orig.w) {
                vx = orig.x
                vy = orig.y
                vw = orig.w
                vh = orig.h
                applyVB()
                return
            }
            vx += mx * (vw - newVw)
            vy += my * (vh - newVh)
            vw = newVw
            vh = newVh
            applyVB()
        }

        // Mouse wheel zoom
        svgEl.addEventListener(
            'wheel',
            (e) => {
                e.preventDefault()
                const rect = svgEl.getBoundingClientRect()
                zoomAround(
                    (e.clientX - rect.left) / rect.width,
                    (e.clientY - rect.top) / rect.height,
                    e.deltaY < 0 ? 1.15 : 1 / 1.15,
                )
            },
            { passive: false },
        )

        // Unified pointer handling for pan (1 pointer) and pinch zoom (2 pointers)
        const pointers = new Map<number, PointerEvent>()
        let lastPinchDist = 0
        let hasPanned = false

        svgEl.addEventListener('pointerdown', (e) => {
            pointers.set(e.pointerId, e)
            hasPanned = false
            if (pointers.size === 2) {
                const [p1, p2] = [...pointers.values()]
                lastPinchDist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY)
            }
        })

        window.addEventListener('pointermove', (e) => {
            if (!pointers.has(e.pointerId)) return
            const prev = pointers.get(e.pointerId)!
            pointers.set(e.pointerId, e)
            const rect = svgEl.getBoundingClientRect()

            if (pointers.size === 2) {
                const [p1, p2] = [...pointers.values()]
                const dist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY)
                if (lastPinchDist > 0) {
                    const cx = (p1.clientX + p2.clientX) / 2
                    const cy = (p1.clientY + p2.clientY) / 2
                    zoomAround(
                        (cx - rect.left) / rect.width,
                        (cy - rect.top) / rect.height,
                        dist / lastPinchDist,
                    )
                }
                lastPinchDist = dist
            } else if (pointers.size === 1) {
                const dx = e.clientX - prev.clientX
                const dy = e.clientY - prev.clientY
                if (!hasPanned && Math.hypot(dx, dy) < 4) return
                hasPanned = true
                svgEl.style.cursor = 'grabbing'
                vx -= (dx / rect.width) * vw
                vy -= (dy / rect.height) * vh
                applyVB()
            }
        })

        window.addEventListener('pointerup', (e) => {
            if (hasPanned && pointers.size <= 1) {
                window.addEventListener('click', (e) => e.stopPropagation(), {
                    capture: true,
                    once: true,
                })
            }
            pointers.delete(e.pointerId)
            if (pointers.size < 2) lastPinchDist = 0
            if (pointers.size === 0) {
                hasPanned = false
                svgEl.style.cursor = ''
            }
        })

        svgEl.addEventListener('dblclick', (e) => {
            e.stopPropagation()
            vx = orig.x
            vy = orig.y
            vw = orig.w
            vh = orig.h
            applyVB()
        })
    }
}
