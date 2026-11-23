import { svgToTerritories, territories } from './data/territories'
import { REGION_DEFS } from './badges'

const W = 1080
const H = 1920
const PAD = 80
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

const BG = '#0f1117'
const TEXT = '#e8e8e8'
const MUTED = '#9ca3af'
const ACCENT = '#7cb9e8'
const LAND = '#2e3347'
const VISITED = '#3b82f6'

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error(`Could not load image ${src.slice(0, 40)}`))
        img.src = src
    })
}

async function svgToImage(svgText: string): Promise<HTMLImageElement> {
    const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }))
    try {
        return await loadImage(url)
    } finally {
        URL.revokeObjectURL(url)
    }
}

async function coloredMap(visited: Set<string>): Promise<HTMLImageElement> {
    const svgText = await (await fetch('/world.svg')).text()
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
    const svg = doc.documentElement
    // Without explicit size some browsers rasterise the SVG at 300×150
    svg.setAttribute('width', '1010')
    svg.setAttribute('height', '666')
    svg.querySelectorAll('path[id], circle[id]').forEach((el) => {
        const related = svgToTerritories.get(el.getAttribute('id')!) ?? []
        el.setAttribute('fill', related.some((t) => visited.has(t.id)) ? VISITED : LAND)
        el.setAttribute('stroke', BG)
        el.setAttribute('stroke-width', '0.5')
    })
    return svgToImage(new XMLSerializer().serializeToString(svg))
}

async function renderImage(visited: Set<string>): Promise<Blob> {
    const [map, logo] = await Promise.all([coloredMap(visited), loadImage('/favicon.svg')])

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, W, H)
    ctx.textBaseline = 'alphabetic'

    // Header
    ctx.drawImage(logo, PAD, 96, 56, 56)
    ctx.fillStyle = TEXT
    ctx.font = `700 44px ${FONT}`
    ctx.fillText('Landnáma', PAD + 72, 140)
    ctx.fillStyle = ACCENT
    ctx.font = `600 36px ${FONT}`
    ctx.textAlign = 'right'
    ctx.fillText('landnama.is', W - PAD, 140)
    ctx.textAlign = 'left'
    ctx.fillStyle = TEXT

    // Count
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

    // Map, full width
    const mapW = W - 40
    const mapH = (mapW * 666) / 1010
    ctx.drawImage(map, 20, 540, mapW, mapH)

    // Region breakdown (active territories only), weakest last since story UI covers the bottom
    const rowsTop = 540 + mapH + 40
    const rowH = 40
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
            const y = rowsTop + i * rowH
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
            ctx.fillStyle = VISITED
            ctx.fillRect(barX, y + 10, (barW * r.got) / r.total, 14)
        })

    return new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
    )
}

let cached: { key: string; file: Promise<File> } | null = null

/** Starts building the image ahead of time; Safari only opens the share sheet right after a tap. */
export function prepareMapImage(visited: Set<string>): Promise<File> {
    const key = [...visited].sort().join(',')
    if (cached?.key !== key) {
        const file = renderImage(visited)
            .then((blob) => new File([blob], 'landnama.png', { type: 'image/png' }))
            .catch((err) => {
                cached = null
                throw err
            })
        cached = { key, file }
    }
    return cached.file
}

/** Opens the share sheet with the story image, or downloads it where sharing files isn't supported. */
export async function shareMapImage(visited: Set<string>): Promise<void> {
    const file = await prepareMapImage(visited)

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
    a.download = 'landnama.png'
    a.click()
    URL.revokeObjectURL(url)
}
