import { territories, allTerritories } from '../data/territories'
import {
    LEVEL_ORDER,
    REGION_DEFS,
    REGION_ORDER,
    TIER_LABELS,
    computeBadgeCategories,
    regionLabel,
} from '../badges'
import type { BadgeCategory, BadgeLevel } from '../badges'

const REGION_OF = new Map(territories.map((t) => [t.id, t.region]))
const TOTALS = new Map<string, number>()
for (const t of territories) TOTALS.set(t.region, (TOTALS.get(t.region) ?? 0) + 1)

const percent = (part: number, total: number) => (total ? Math.round((100 * part) / total) : 0)

// Region badges follow the sail; the overall badges sit at bow and stern
const REGION_BADGE = new Map(REGION_DEFS.map((d) => [d.id, d.region]))
const position = (b: BadgeCategory) =>
    b.id === 'traveler'
        ? -1
        : b.id === 'historian'
          ? 99
          : REGION_ORDER.indexOf(REGION_BADGE.get(b.id)!)
const rank = (b: BadgeCategory) => (b.earned ? LEVEL_ORDER.indexOf(b.earned) + 1 : 0) + b.progress

export interface Voyage {
    visitedCount: number
    got: Map<string, number>
    shields: BadgeCategory[]
}

/** What the ship shows for a set of visits: progress per region and the eight best badges. */
export function voyage(visited: Set<string>): Voyage {
    const got = new Map<string, number>()
    for (const id of visited) {
        const r = REGION_OF.get(id)
        if (r) got.set(r, (got.get(r) ?? 0) + 1)
    }
    const shields = computeBadgeCategories(visited, allTerritories)
        .sort((a, b) => rank(b) - rank(a))
        .slice(0, 8)
        .sort((a, b) => position(a) - position(b))
    return { visitedCount: visited.size, got, shields }
}

// The hull is drawn 260 wide and scaled into the 252-wide view

const VIEW = { w: 252, h: 236 }
const SAIL = { x: 36, y: 15, w: 180, h: 142, gap: 2 }
const STRIPE_W = (SAIL.w - SAIL.gap * (REGION_ORDER.length - 1)) / REGION_ORDER.length
const stripeX = (i: number) => SAIL.x + i * (STRIPE_W + SAIL.gap)
const HULL_SCALE = VIEW.w / 260
const HULL_Y = 164.3
const SHIELD_R = 11

// Shields hang along the gunwale curve (quadratic from (12,10) via (130,50) to (248,10))
function shieldAt(i: number, n: number) {
    const t = 0.17 + (0.66 * i) / (n - 1)
    const x = 12 * (1 - t) ** 2 + 260 * t * (1 - t) + 248 * t ** 2
    const y = 10 * (1 - t) ** 2 + 100 * t * (1 - t) + 10 * t ** 2
    return { x: Math.round(x), y: Math.round(y + 7) }
}

export type ShipPalette = Record<
    'ink' | 'accent' | 'cloth' | 'hull' | 'strake' | 'sea' | BadgeLevel,
    string
>

export function shipCss(p: ShipPalette): string {
    return `
.ship-svg .ink { fill: ${p.ink} }
.ship-svg .cloth { fill: ${p.cloth} }
.ship-svg .fill { fill: ${p.accent} }
.ship-svg .dim { opacity: 0.45 }
.ship-svg .hull { fill: ${p.hull} }
.ship-svg .strake { fill: none; stroke: ${p.strake}; stroke-width: 1.5 }
.ship-svg .gunwale { fill: none; stroke: ${p.ink}; stroke-width: 2.5 }
.ship-svg .sea { fill: none; stroke: ${p.sea}; stroke-width: 2 }
.ship-svg .shield { color: ${p.hull} }
.ship-svg .shield circle { fill: ${p.hull}; stroke: ${p.hull}; stroke-width: 1.5 }
.ship-svg .shield.unearned { color: ${p.strake} }
${LEVEL_ORDER.map((l) => `.ship-svg .shield.${l} circle { fill: ${p[l]} }`).join('\n')}
.ship-svg .shield.active { transform: scale(1.15); transform-box: fill-box; transform-origin: center }`
}

const THEME_PALETTE: ShipPalette = {
    ink: 'var(--text)',
    accent: 'var(--accent)',
    cloth: 'var(--cloth)',
    hull: 'var(--hull)',
    strake: 'var(--strake)',
    sea: 'var(--sea)',
    bronze: 'var(--bronze)',
    silver: 'var(--silver)',
    gold: 'var(--gold)',
    platinum: 'var(--platinum)',
    diamond: 'var(--diamond)',
}
document.head.insertAdjacentHTML('beforeend', `<style>${shipCss(THEME_PALETTE)}</style>`)

/** Each sail stripe's place in the 252×236 drawing, for drawing labels on top of it. */
export function sailStripes(v: Voyage) {
    return REGION_ORDER.map((r, i) => {
        const pct = percent(v.got.get(r) ?? 0, TOTALS.get(r)!)
        return {
            label: regionLabel(r),
            pct,
            x: stripeX(i),
            y: SAIL.y,
            w: STRIPE_W,
            h: SAIL.h,
            fill: (SAIL.h * pct) / 100,
        }
    })
}

export function shipSvg(v: Voyage, focus: { region?: string | null; shield?: string | null } = {}) {
    const clip = `${SAIL.x},${SAIL.y} ${SAIL.x + SAIL.w},${SAIL.y} ${SAIL.x + SAIL.w * 1.04},${SAIL.y + SAIL.h * 0.88} ${SAIL.x + SAIL.w / 2},${SAIL.y + SAIL.h} ${SAIL.x - SAIL.w * 0.04},${SAIL.y + SAIL.h * 0.88}`
    const stripes = REGION_ORDER.map((r, i) => {
        const fill = (SAIL.h * percent(v.got.get(r) ?? 0, TOTALS.get(r)!)) / 100
        const dim = focus.region && focus.region !== r ? ' class="dim"' : ''
        return `<g${dim}><rect class="cloth" x="${stripeX(i)}" y="${SAIL.y}" width="${STRIPE_W}" height="${SAIL.h}"/><rect class="fill" x="${stripeX(i)}" y="${SAIL.y}" width="${STRIPE_W}" height="${fill}"/></g>`
    }).join('')
    const shields = v.shields
        .map((b, i) => {
            const { x, y } = shieldAt(i, v.shields.length)
            const s = SHIELD_R * 1.1
            const icon = b.icon.replace(
                '<svg ',
                `<svg x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" `,
            )
            const active = focus.shield === b.id ? ' active' : ''
            return `<g class="shield ${b.earned ?? 'unearned'}${active}"><circle cx="${x}" cy="${y}" r="${SHIELD_R}"/>${icon}</g>`
        })
        .join('')
    return `
<svg xmlns="http://www.w3.org/2000/svg" class="ship-svg" viewBox="0 0 ${VIEW.w} ${VIEW.h}" overflow="visible" aria-hidden="true">
  <rect class="ink" x="125" y="0" width="3" height="200"/>
  <rect class="ink" x="30" y="10" width="192" height="5" rx="2.5"/>
  <clipPath id="sail-clip"><polygon points="${clip}"/></clipPath>
  <g clip-path="url(#sail-clip)">${stripes}</g>
  <g transform="translate(0 ${HULL_Y}) scale(${HULL_SCALE})">
    <path class="hull" d="M12 10 Q130 50 248 10 Q251 -4 246 -14 Q243 -20 239 -16 Q244 -6 240 6 Q130 88 20 6 Q16 -6 21 -16 Q17 -20 14 -14 Q9 -4 12 10 Z"/>
    <path class="strake" d="M14 14 Q130 58 246 14"/>
    <path class="strake" d="M17 22 Q130 70 243 22"/>
    <path class="strake" d="M22 31 Q130 80 238 31"/>
    <path class="gunwale" d="M12 10 Q130 50 248 10"/>
    ${shields}
    <path class="sea" d="M-6 66 Q30 60 66 66 T138 66 T210 66 T282 66"/>
  </g>
</svg>`
}

const pct = (n: number, of: number) => `${(100 * n) / of}%`

export interface Sail {
    el: HTMLElement
    update(visited: Set<string>): void
    pin(region: string | null): void
}

/** The ship and tally; hovering a stripe or shield shows it in the tally, clicking a stripe picks its region. */
export function createSail(onPick?: (region: string | null) => void): Sail {
    const el = document.createElement('div')
    el.className = 'ship-block'
    el.innerHTML = `
      <figure class="ship">
        <div class="ship-drawing"></div>
        <div class="ship-stripes" role="group" aria-label="Heimshlutar">
          ${REGION_ORDER.map(
              (r, i) =>
                  `<button type="button" data-region="${r}" style="left:${pct(stripeX(i), VIEW.w)};top:${pct(SAIL.y, VIEW.h)};width:${pct(STRIPE_W, VIEW.w)};height:${pct(SAIL.h, VIEW.h)}"></button>`,
          ).join('')}
        </div>
        <div class="ship-shields" role="group" aria-label="Merki"></div>
      </figure>
      <div class="tally" aria-live="polite">
        <p class="tally-num">
          <span class="sr-only">Numið land:</span>
          <b class="tally-got"></b><span class="tally-total"></span><span class="tally-pct"></span>
        </p>
        <div class="tally-bar"><span></span></div>
        <p class="tally-caption"></p>
      </div>`

    const drawing = el.querySelector<HTMLElement>('.ship-drawing')!
    const stripes = [...el.querySelectorAll<HTMLButtonElement>('.ship-stripes button')]
    const shieldsEl = el.querySelector<HTMLElement>('.ship-shields')!
    const gotEl = el.querySelector('.tally-got')!
    const totalEl = el.querySelector('.tally-total')!
    const pctEl = el.querySelector('.tally-pct')!
    const barEl = el.querySelector<HTMLElement>('.tally-bar span')!
    const captionEl = el.querySelector('.tally-caption')!

    let v: Voyage = { visitedCount: 0, got: new Map(), shields: [] }
    let pinned: string | null = null
    let hover: string | null = null
    let shield: BadgeCategory | null = null

    function render() {
        const region = hover ?? pinned
        drawing.innerHTML = shipSvg(v, { region, shield: shield?.id })

        for (const s of stripes) {
            const r = s.dataset.region!
            s.setAttribute(
                'aria-label',
                `${regionLabel(r)}: ${v.got.get(r) ?? 0} af ${TOTALS.get(r)}`,
            )
            s.setAttribute('aria-pressed', String(pinned === r))
        }

        let got = region ? (v.got.get(region) ?? 0) : v.visitedCount
        let total = region ? TOTALS.get(region)! : territories.length
        let caption = region ? regionLabel(region) : ''
        if (shield) {
            got = shield.current
            total = shield.target
            caption = `${shield.label} · ${shield.earned ? TIER_LABELS[shield.earned] : 'Ekki unnið'}`
        }
        gotEl.textContent = String(got)
        totalEl.textContent = `/ ${total}`
        pctEl.textContent = `${percent(got, total)}%`
        barEl.style.width = `${percent(got, total)}%`
        captionEl.textContent = caption
    }

    function renderShieldButtons() {
        shieldsEl.innerHTML = v.shields
            .map((b, i) => {
                const { x, y } = shieldAt(i, v.shields.length)
                const cx = x * HULL_SCALE
                const cy = HULL_Y + y * HULL_SCALE
                const r = SHIELD_R * HULL_SCALE
                const tier = b.earned ? TIER_LABELS[b.earned] : 'Ekki unnið'
                return `<button type="button" data-id="${b.id}" aria-label="${b.label}: ${tier}" style="left:${pct(cx - r, VIEW.w)};top:${pct(cy - r, VIEW.h)};width:${pct(2 * r, VIEW.w)};height:${pct(2 * r, VIEW.h)}"></button>`
            })
            .join('')
    }

    const setHover = (region: string | null) => {
        hover = region
        render()
    }
    const pick = (region: string | null) => {
        pinned = region
        hover = null
        render()
        onPick?.(region)
    }
    const setShield = (id: string | null) => {
        shield = v.shields.find((b) => b.id === id) ?? null
        render()
    }

    for (const s of stripes) {
        const r = s.dataset.region!
        s.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && setHover(r))
        s.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && setHover(null))
        s.addEventListener('focus', () => setHover(r))
        s.addEventListener('blur', () => setHover(null))
        s.addEventListener('click', () => pick(pinned === r ? null : r))
    }

    const shieldId = (e: Event) =>
        (e.target as HTMLElement).closest<HTMLElement>('[data-id]')?.dataset.id
    shieldsEl.addEventListener('pointerover', (e) => setShield(shieldId(e) ?? null))
    shieldsEl.addEventListener('pointerout', (e) => e.pointerType === 'mouse' && setShield(null))
    shieldsEl.addEventListener('focusin', (e) => setShield(shieldId(e) ?? null))
    shieldsEl.addEventListener('focusout', () => setShield(null))
    // A tapped shield stays shown until the next tap elsewhere
    const onTapOutside = (e: PointerEvent) => {
        if (!el.isConnected) return document.removeEventListener('pointerdown', onTapOutside)
        if (shield && !shieldsEl.contains(e.target as Node)) setShield(null)
    }
    document.addEventListener('pointerdown', onTapOutside)

    el.addEventListener('keydown', (e) => e.key === 'Escape' && pinned && pick(null))
    render()

    return {
        el,
        update(visited) {
            v = voyage(visited)
            renderShieldButtons()
            render()
        },
        pin(region) {
            pinned = region
            render()
        },
    }
}
