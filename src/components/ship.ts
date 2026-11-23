import { territories, allTerritories } from '../data/territories'
import { LEVEL_ORDER, REGION_DEFS, TIER_LABELS, computeBadgeCategories } from '../badges'
import type { BadgeCategory } from '../badges'

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

const SHIELD_COUNT = 8
const SHIELD_R = 11

const rank = (b: BadgeCategory) => (b.earned ? LEVEL_ORDER.indexOf(b.earned) + 1 : 0) + b.progress

// Region badges follow the sail; the overall badges sit at bow and stern
const REGION_BADGE = new Map(REGION_DEFS.map((d) => [d.id, d.region]))
const position = (b: BadgeCategory) =>
    b.id === 'traveler'
        ? -1
        : b.id === 'historian'
          ? 99
          : SAIL_ORDER.indexOf(REGION_BADGE.get(b.id)!)

function bestShields(badges: BadgeCategory[]) {
    return [...badges]
        .sort((a, b) => rank(b) - rank(a))
        .slice(0, SHIELD_COUNT)
        .sort((a, b) => position(a) - position(b))
}

// Shields hang along the gunwale curve (quadratic from (12,10) via (130,50) to (248,10))
function shieldAt(i: number, n: number) {
    const t = 0.17 + (0.66 * i) / (n - 1)
    const x = 12 * (1 - t) ** 2 + 260 * t * (1 - t) + 248 * t ** 2
    const y = 10 * (1 - t) ** 2 + 100 * t * (1 - t) + 10 * t ** 2
    return { x: Math.round(x), y: Math.round(y + 7) }
}

const HULL = `
<svg class="ship-hull" viewBox="0 -22 260 96" aria-hidden="true">
  <path class="hull" d="M12 10 Q130 50 248 10 Q251 -4 246 -14 Q243 -20 239 -16 Q244 -6 240 6 Q130 88 20 6 Q16 -6 21 -16 Q17 -20 14 -14 Q9 -4 12 10 Z"/>
  <path class="strake" d="M14 14 Q130 58 246 14"/>
  <path class="strake" d="M17 22 Q130 70 243 22"/>
  <path class="strake" d="M22 31 Q130 80 238 31"/>
  <path class="gunwale" d="M12 10 Q130 50 248 10"/>
  <g class="shields"></g>
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
    const shieldsEl = el.querySelector<SVGGElement>('.shields')!

    const got = new Map<string, number>()
    let visitedCount = 0
    let badges: BadgeCategory[] = []
    let pinned: string | null = null
    let hover: string | null = null
    let badgeHover: BadgeCategory | null = null

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

        let g = active ? (got.get(active) ?? 0) : visitedCount
        let total = active ? TOTALS.get(active)! : territories.length
        let caption = active ? LABELS.get(active)! : ''
        if (badgeHover) {
            g = badgeHover.current
            total = badgeHover.target
            caption = `${badgeHover.label} · ${badgeHover.earned ? TIER_LABELS[badgeHover.earned] : 'Ekki unnið'}`
        }
        const pct = percent(g, total)
        gotEl.textContent = String(g)
        totalEl.textContent = `/ ${total}`
        pctEl.textContent = `${pct}%`
        barEl.style.width = `${pct}%`
        captionEl.textContent = caption
    }

    function renderShields() {
        shieldsEl.innerHTML = badges
            .map((b, i) => {
                const { x, y } = shieldAt(i, badges.length)
                const tier = b.earned ? TIER_LABELS[b.earned] : 'Ekki unnið'
                const s = SHIELD_R * 1.1
                const icon = b.icon.replace(
                    '<svg ',
                    `<svg x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" `,
                )
                return `<g class="badge-shield ${b.earned ?? 'unearned'}" data-id="${b.id}" tabindex="0" role="img" aria-label="${b.label}: ${tier}">
                  <circle cx="${x}" cy="${y}" r="${SHIELD_R}"/>${icon}
                </g>`
            })
            .join('')
    }

    const showBadge = (target: EventTarget | null) => {
        const id = (target as Element | null)?.closest<HTMLElement>('.badge-shield')?.dataset.id
        badgeHover = badges.find((b) => b.id === id) ?? null
        render()
    }
    shieldsEl.addEventListener('pointerover', (e) => showBadge(e.target))
    shieldsEl.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && showBadge(null))
    shieldsEl.addEventListener('focusin', (e) => showBadge(e.target))
    shieldsEl.addEventListener('focusout', () => showBadge(null))
    // A tapped shield stays shown until the next tap elsewhere
    const onTapOutside = (e: PointerEvent) => {
        if (!el.isConnected) return document.removeEventListener('pointerdown', onTapOutside)
        if (badgeHover && !shieldsEl.contains(e.target as Node)) showBadge(null)
    }
    document.addEventListener('pointerdown', onTapOutside)

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
            badges = bestShields(computeBadgeCategories(visited, allTerritories))
            renderShields()
            render()
        },
        pin(region) {
            pinned = region
            render()
        },
    }
}
