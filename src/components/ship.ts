import { territories } from '../data/territories'
import { REGION_DEFS } from '../badges'

// West to east, so the sail reads like the map
const SAIL_ORDER = [
    'Pacific Ocean',
    'North America',
    'Central America',
    'South America',
    'Caribbean',
    'Atlantic Ocean',
    'Europe & Mediterranean',
    'Africa',
    'Middle East',
    'Indian Ocean',
    'Asia',
    'Antarctica',
]

const LABELS = new Map(REGION_DEFS.map((d) => [d.region, d.label]))
const REGION_OF = new Map(territories.map((t) => [t.id, t.region]))
const TOTALS = new Map<string, number>()
for (const t of territories) TOTALS.set(t.region, (TOTALS.get(t.region) ?? 0) + 1)

const percent = (part: number, total: number) => (total ? Math.round((100 * part) / total) : 0)

const HULL = `
<svg class="ship-hull" viewBox="0 -22 260 96" aria-hidden="true">
  <path class="hull" d="M12 10 Q130 50 248 10 Q251 -4 246 -14 Q243 -20 239 -16 Q244 -6 240 6 Q130 88 20 6 Q16 -6 21 -16 Q17 -20 14 -14 Q9 -4 12 10 Z"/>
  <path class="strake" d="M14 14 Q130 58 246 14"/>
  <path class="strake" d="M17 22 Q130 70 243 22"/>
  <path class="strake" d="M22 31 Q130 80 238 31"/>
  <path class="gunwale" d="M12 10 Q130 50 248 10"/>
  <g class="shields">
    <circle class="shield-red" cx="59" cy="27" r="8"/><circle cx="83" cy="31" r="8"/>
    <circle class="shield-red" cx="106" cy="34" r="8"/><circle cx="154" cy="34" r="8"/>
    <circle class="shield-red" cx="177" cy="31" r="8"/><circle cx="201" cy="27" r="8"/>
  </g>
  <g class="bosses">
    <circle cx="59" cy="27" r="2"/><circle cx="83" cy="31" r="2"/><circle cx="106" cy="34" r="2"/>
    <circle cx="154" cy="34" r="2"/><circle cx="177" cy="31" r="2"/><circle cx="201" cy="27" r="2"/>
  </g>
  <path class="sea" d="M-6 66 Q30 60 66 66 T138 66 T210 66 T282 66"/>
</svg>`

export interface Sail {
    el: HTMLElement
    update(visited: Set<string>): void
    pin(region: string | null): void
}

export function createSail(onPick: (region: string | null) => void): Sail {
    const el = document.createElement('div')
    el.className = 'ship-block'
    el.innerHTML = `
      <figure class="ship">
        <div class="ship-mast"></div>
        <div class="ship-yard"></div>
        <div class="ship-sail" role="group" aria-label="Heimshlutar">
          ${SAIL_ORDER.map((r) => `<button type="button" class="sail-stripe" data-region="${r}"><span></span></button>`).join('')}
        </div>
        ${HULL}
      </figure>
      <div class="tally" aria-live="polite">
        <p class="tally-num">
          <span class="sr-only">Numið land:</span>
          <b class="tally-got"></b><span class="tally-total"></span><span class="tally-pct"></span>
        </p>
        <div class="tally-bar"><span></span></div>
        <p class="tally-caption"></p>
      </div>`

    const stripes = [...el.querySelectorAll<HTMLButtonElement>('.sail-stripe')]
    const gotEl = el.querySelector('.tally-got')!
    const totalEl = el.querySelector('.tally-total')!
    const pctEl = el.querySelector('.tally-pct')!
    const barEl = el.querySelector<HTMLElement>('.tally-bar span')!
    const captionEl = el.querySelector('.tally-caption')!

    const got = new Map<string, number>()
    let visitedCount = 0
    let pinned: string | null = null
    let hover: string | null = null

    function render() {
        const active = hover ?? pinned
        for (const s of stripes) {
            const r = s.dataset.region!
            const g = got.get(r) ?? 0
            const total = TOTALS.get(r)!
            s.setAttribute('aria-label', `${LABELS.get(r)}: ${g} af ${total}`)
            s.setAttribute('aria-pressed', String(pinned === r))
            s.classList.toggle('dim', active !== null && active !== r)
            ;(s.firstElementChild as HTMLElement).style.height = `${percent(g, total)}%`
        }

        const g = active ? (got.get(active) ?? 0) : visitedCount
        const total = active ? TOTALS.get(active)! : territories.length
        const pct = percent(g, total)
        gotEl.textContent = String(g)
        totalEl.textContent = `/ ${total}`
        pctEl.textContent = `${pct}%`
        barEl.style.width = `${pct}%`
        captionEl.textContent = active ? LABELS.get(active)! : ''
    }

    const setHover = (region: string | null) => {
        hover = region
        render()
    }
    const pick = (region: string | null) => {
        pinned = region
        hover = null
        render()
        onPick(region)
    }

    for (const s of stripes) {
        const r = s.dataset.region!
        s.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && setHover(r))
        s.addEventListener('focus', () => setHover(r))
        s.addEventListener('blur', () => setHover(null))
        s.addEventListener('click', () => pick(pinned === r ? null : r))
    }
    el.querySelector('.ship-sail')!.addEventListener('pointerleave', () => setHover(null))
    el.addEventListener('keydown', (e) => e.key === 'Escape' && pinned && pick(null))
    render()

    return {
        el,
        update(visited) {
            got.clear()
            for (const id of visited) {
                const r = REGION_OF.get(id)
                if (r) got.set(r, (got.get(r) ?? 0) + 1)
            }
            visitedCount = visited.size
            render()
        },
        pin(region) {
            pinned = region
            render()
        },
    }
}
