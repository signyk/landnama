import { svgToTerritories, territories } from './data/territories'
import { REGION_DEFS } from './badges'
import { LOGO } from './components/logo'
import { sailStripes, shipCss, shipSvg, voyage } from './components/ship'
import type { Voyage } from './components/ship'
import { LEVEL_ORDER, TIER_LABELS } from './badges'
import type { BadgeLevel } from './badges'

export type ShareKind = 'map' | 'ship'

const W = 1080
const H = 1920
const PAD = 80
const FONT = "'Schibsted Grotesk Variable', system-ui, sans-serif"

// The light theme's colours
const BG = '#eceee9'
const TEXT = '#1d2420'
const MUTED = '#4f5852'
const ACCENT = '#2e4d7a'
const ON_ACCENT = '#ffffff'
const LAND = '#d5d9d2'
const SHIP = {
    ink: TEXT,
    accent: ACCENT,
    cloth: '#f6f7f3',
    hull: '#3a3f3a',
    strake: '#596058',
    sea: '#9aa59c',
    bronze: '#9a5a24',
    silver: '#6e7277',
    gold: '#9a7a06',
    platinum: '#4e6878',
    diamond: '#1b7f8c',
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error(`Could not load image ${src.slice(0, 40)}`))
        img.src = src
    })
}

/** Rasterises SVG markup at a fixed size; `edit` adjusts it first, since page CSS doesn't reach images. */
async function svgImage(
    markup: string,
    width: number,
    height: number,
    edit?: (svg: Element) => void,
): Promise<HTMLImageElement> {
    const svg = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement
    // Without explicit size some browsers rasterise the SVG at 300×150
    svg.setAttribute('width', String(width))
    svg.setAttribute('height', String(height))
    edit?.(svg)
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    try {
        return await loadImage(url)
    } finally {
        URL.revokeObjectURL(url)
    }
}

async function mapImage(visited: Set<string>) {
    const markup = await (await fetch('/world.svg')).text()
    return svgImage(markup, 1010, 666, (svg) =>
        svg.querySelectorAll('path[id], circle[id]').forEach((el) => {
            const related = svgToTerritories.get(el.getAttribute('id')!) ?? []
            el.setAttribute('fill', related.some((t) => visited.has(t.id)) ? ACCENT : LAND)
            el.setAttribute('stroke', BG)
            el.setAttribute('stroke-width', '0.5')
        }),
    )
}

const logoImage = () =>
    svgImage(LOGO, 320, 260, (svg) => {
        const fills = { 'logo-ink': TEXT, 'logo-sail': ACCENT, 'logo-cloth': '#bac4cf' }
        for (const [cls, fill] of Object.entries(fills)) {
            svg.querySelectorAll(`.${cls}`).forEach((el) => el.setAttribute('fill', fill))
        }
    })

const shipImage = (v: Voyage) =>
    svgImage(shipSvg(v), 920, 862, (svg) => {
        const style = svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'style')
        style.textContent = shipCss(SHIP)
        svg.prepend(style)
    })

function drawRegionBars(ctx: CanvasRenderingContext2D, visited: Set<string>, top: number) {
    // Weakest last, since the story UI covers the bottom
    REGION_DEFS.map((def) => {
        const inRegion = territories.filter((t) => t.region === def.region)
        return {
            label: def.label,
            total: inRegion.length,
            got: inRegion.filter((t) => visited.has(t.id)).length,
        }
    })
        .sort((a, b) => b.got / b.total - a.got / a.total)
        .forEach((r, i) => {
            const y = top + i * 40
            ctx.fillStyle = TEXT
            ctx.font = `400 26px ${FONT}`
            ctx.fillText(r.label, PAD, y + 26)
            ctx.fillStyle = MUTED
            ctx.textAlign = 'right'
            ctx.fillText(`${r.got} / ${r.total}`, W - PAD, y + 26)
            ctx.textAlign = 'left'

            const barX = 460
            const barW = W - PAD - 130 - barX
            ctx.fillStyle = LAND
            ctx.fillRect(barX, y + 10, barW, 14)
            ctx.fillStyle = ACCENT
            ctx.fillRect(barX, y + 10, (barW * r.got) / r.total, 14)
        })
}

const SHIP_X = (W - 920) / 2
const SHIP_Y = 560
const SHIP_SCALE = 920 / 252

// Text over a stripe's fill is clipped to it and drawn in white
function drawSailLabels(ctx: CanvasRenderingContext2D, v: Voyage) {
    ctx.save()
    ctx.translate(SHIP_X, SHIP_Y)
    ctx.scale(SHIP_SCALE, SHIP_SCALE)
    for (const s of sailStripes(v)) {
        const mid = s.x + s.w / 2
        for (const [top, height, colour] of [
            [s.y, s.fill, ON_ACCENT],
            [s.y + s.fill, s.h - s.fill, MUTED],
        ] as const) {
            ctx.save()
            ctx.beginPath()
            ctx.rect(s.x, top, s.w, height)
            ctx.clip()
            ctx.translate(mid + 2.1, s.y + s.h - 22)
            ctx.rotate(-Math.PI / 2)
            ctx.fillStyle = colour
            ctx.font = `600 6px ${FONT}`
            ctx.fillText(s.label, 0, 0)
            ctx.restore()
        }
        if (s.pct) {
            const inside = s.fill > 10
            ctx.fillStyle = inside ? ON_ACCENT : MUTED
            ctx.font = `600 4.6px ${FONT}`
            ctx.textAlign = 'center'
            // At the top of the stripe, clear of the name below
            ctx.fillText(`${s.pct}%`, mid, s.y + (inside ? 7 : s.fill + 7.5))
            ctx.textAlign = 'left'
        }
    }
    ctx.restore()
}

// "● 3 silfur  ● 5 brons", centred, for the shields on the ship
function drawBadgeTally(ctx: CanvasRenderingContext2D, v: Voyage, y: number) {
    const counts = new Map<BadgeLevel, number>()
    for (const b of v.shields) {
        if (b.earned) counts.set(b.earned, (counts.get(b.earned) ?? 0) + 1)
    }
    ctx.font = `400 38px ${FONT}`
    const items = [...LEVEL_ORDER]
        .reverse()
        .filter((l) => counts.has(l))
        .map((l) => ({ level: l, text: `${counts.get(l)} ${TIER_LABELS[l].toLowerCase()}` }))
    const DOT = 28
    const GAP = 48
    const widths = items.map((i) => DOT + 14 + ctx.measureText(i.text).width)
    let x = (W - widths.reduce((a, b) => a + b, 0) - GAP * (items.length - 1)) / 2
    items.forEach((item, i) => {
        ctx.fillStyle = SHIP[item.level]
        ctx.beginPath()
        ctx.arc(x + DOT / 2, y - 13, DOT / 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = MUTED
        ctx.fillText(item.text, x + DOT + 14, y)
        x += widths[i] + GAP
    })
}

async function renderImage(visited: Set<string>, kind: ShareKind): Promise<Blob> {
    const ship = voyage(visited)
    const [picture, logo] = await Promise.all([
        kind === 'map' ? mapImage(visited) : shipImage(ship),
        logoImage(),
        document.fonts.load(`10px ${FONT}`),
    ])

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, W, H)

    ctx.drawImage(logo, PAD, 98, 64, 52)
    ctx.fillStyle = TEXT
    ctx.font = `700 44px ${FONT}`
    ctx.fillText('Landnáma', PAD + 80, 140)
    ctx.fillStyle = MUTED
    ctx.font = `600 36px ${FONT}`
    ctx.textAlign = 'right'
    ctx.fillText('landnama.is', W - PAD, 140)
    ctx.textAlign = 'left'

    const count = String(visited.size)
    ctx.fillStyle = ACCENT
    ctx.font = `800 200px ${FONT}`
    ctx.fillText(count, PAD, 420)
    const countWidth = ctx.measureText(count).width
    ctx.fillStyle = MUTED
    ctx.font = `600 80px ${FONT}`
    ctx.fillText(` / ${territories.length}`, PAD + countWidth, 420)
    ctx.font = `400 40px ${FONT}`
    ctx.fillText('landsvæði heimsótt', PAD, 485)

    if (kind === 'map') {
        const mapW = W - 40
        const mapH = (mapW * 666) / 1010
        ctx.drawImage(picture, 20, 540, mapW, mapH)
        drawRegionBars(ctx, visited, 540 + mapH + 40)
    } else {
        ctx.drawImage(picture, SHIP_X, SHIP_Y, 920, 862)
        drawSailLabels(ctx, ship)
        drawBadgeTally(ctx, ship, 1530)
    }

    return new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
    )
}

const cache = new Map<string, Promise<File>>()

/** Starts building the image ahead of time; Safari only opens the share sheet right after a tap. */
export function prepareShareImage(visited: Set<string>, kind: ShareKind): Promise<File> {
    const key = `${kind}:${[...visited].sort().join(',')}`
    let file = cache.get(key)
    if (!file) {
        file = renderImage(visited, kind).then(
            (blob) => new File([blob], `landnama-${kind}.png`, { type: 'image/png' }),
        )
        file.catch(() => cache.delete(key))
        cache.set(key, file)
    }
    return file
}

/** Opens the share sheet with the story image, or downloads it where sharing files isn't supported. */
export async function shareImage(visited: Set<string>, kind: ShareKind): Promise<void> {
    const file = await prepareShareImage(visited, kind)

    if (navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({ files: [file] })
        } catch (err) {
            if ((err as Error).name !== 'AbortError') throw err
        }
        return
    }

    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
}
