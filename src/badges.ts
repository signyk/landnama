import { territories as activeTerritories, retiredTerritories } from './data/territories'
import type { Territory } from './data/territories'

export type BadgeLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export type BadgeTierDef = {
    level: BadgeLevel
    description: string
    threshold: number
}

export type BadgeCategory = {
    id: string
    label: string
    icon: string
    earned: BadgeLevel | null
    progress: number
    progressDetail: string
    description: string
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const ICON_GLOBE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <line x1="2" y1="12" x2="22" y2="12"/>
  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
</svg>`

const ICON_CLOCK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <polyline points="12 6 12 12 16 14"/>
</svg>`

// Europe & Mediterranean — landmark (columns)
const ICON_EUROPE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="3" y1="22" x2="21" y2="22"/>
  <line x1="6" y1="18" x2="6" y2="11"/>
  <line x1="10" y1="18" x2="10" y2="11"/>
  <line x1="14" y1="18" x2="14" y2="11"/>
  <line x1="18" y1="18" x2="18" y2="11"/>
  <polygon points="12 2 20 7 4 7"/>
</svg>`

// Africa — sun
const ICON_AFRICA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="4"/>
  <line x1="12" y1="2" x2="12" y2="4"/>
  <line x1="12" y1="20" x2="12" y2="22"/>
  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
  <line x1="2" y1="12" x2="4" y2="12"/>
  <line x1="20" y1="12" x2="22" y2="12"/>
  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
</svg>`

// Asia — pagoda (layered roof shapes)
const ICON_ASIA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="12" y1="2" x2="12" y2="5"/>
  <polyline points="9 5 12 2 15 5 15 7 9 7 9 5"/>
  <polyline points="6 10 18 10"/>
  <polyline points="5 10 5 13 19 13 19 10"/>
  <polyline points="3 16 21 16"/>
  <polyline points="2 16 2 20 22 20 22 16"/>
  <line x1="2" y1="22" x2="22" y2="22"/>
</svg>`

// Pacific Ocean — waves
const ICON_PACIFIC = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
  <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
  <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
</svg>`

// Caribbean — anchor
const ICON_CARIBBEAN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="5" r="3"/>
  <line x1="12" y1="22" x2="12" y2="8"/>
  <path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
</svg>`

// Middle East — crescent moon
const ICON_MIDDLEEAST = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>`

// Indian Ocean — sailboat (Lucide sailboat)
const ICON_INDIAN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 2v15"/>
  <path d="M7 22a4 4 0 0 1-4-4 1 1 0 0 1 1-1h16a1 1 0 0 1 1 1 4 4 0 0 1-4 4z"/>
  <path d="M9.159 2.46a1 1 0 0 1 1.521-.193l9.977 8.98A1 1 0 0 1 20 13H4a1 1 0 0 1-.824-1.567z"/>
</svg>`

// Atlantic Ocean — compass
const ICON_ATLANTIC = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
</svg>`

// South America — mountain (Lucide mountain)
const ICON_SOUTHAMERICA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m8 3 4 8 5-5 5 15H2L8 3z"/>
</svg>`

// Antarctica — snowflake (Lucide snowflake)
const ICON_ANTARCTICA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="2" y1="12" x2="22" y2="12"/>
  <line x1="12" y1="2" x2="12" y2="22"/>
  <path d="m20 16-4-4 4-4"/>
  <path d="m4 8 4 4-4 4"/>
  <path d="m16 4-4 4-4-4"/>
  <path d="m8 20 4-4 4 4"/>
</svg>`

// Central America — pyramid
const ICON_CENTRALAMERICA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="12 3 22 20 2 20"/>
  <line x1="7" y1="14" x2="17" y2="14"/>
</svg>`

// North America — leaf
const ICON_NORTHAMERICA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
</svg>`

// ─── Tier helpers ─────────────────────────────────────────────────────────────

const LEVEL_ORDER: BadgeLevel[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond']

function computeCategory(
    id: string,
    label: string,
    icon: string,
    tiers: BadgeTierDef[],
    value: number,
): BadgeCategory {
    let earned: BadgeLevel | null = null
    for (const t of tiers) {
        if (value >= t.threshold) earned = t.level
    }

    const earnedIdx = earned ? LEVEL_ORDER.indexOf(earned) : -1
    const nextTier = tiers.find((t) => LEVEL_ORDER.indexOf(t.level) > earnedIdx) ?? null

    let progress: number
    let progressDetail: string
    let description: string

    if (!nextTier) {
        const maxTier = tiers[tiers.length - 1]
        progress = 1
        progressDetail = `${maxTier.threshold} / ${maxTier.threshold}`
        description = maxTier.description
    } else {
        const earnedTierDef = earned ? tiers.find((t) => t.level === earned) : null
        progress = Math.min(value / nextTier.threshold, 1)
        progressDetail = `${Math.min(value, nextTier.threshold)} / ${nextTier.threshold}`
        description = earnedTierDef ? earnedTierDef.description : nextTier.description
    }

    return { id, label, icon, earned, progress, progressDetail, description }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeBadgeCategories(
    visited: Set<string>,
    _allTerritories: Territory[],
): BadgeCategory[] {
    const totalVisited = visited.size
    const retiredVisited = retiredTerritories.filter((t) => visited.has(t.id)).length

    const regionTotal = new Map<string, number>()
    for (const t of activeTerritories) {
        regionTotal.set(t.region, (regionTotal.get(t.region) ?? 0) + 1)
    }
    const regionVisitedActive = new Map<string, number>()
    for (const t of activeTerritories) {
        if (visited.has(t.id)) {
            regionVisitedActive.set(t.region, (regionVisitedActive.get(t.region) ?? 0) + 1)
        }
    }

    const categories: BadgeCategory[] = []

    // 1. Ferðamaður — total count
    categories.push(
        computeCategory(
            'traveler',
            'Heimsfari',
            ICON_GLOBE,
            [
                { level: 'bronze', threshold: 10, description: 'Heimsótt 10 landsvæði' },
                { level: 'silver', threshold: 25, description: 'Heimsótt 25 landsvæði' },
                { level: 'gold', threshold: 50, description: 'Heimsótt 50 landsvæði' },
                {
                    level: 'platinum',
                    threshold: 100,
                    description: 'Heimsótt 100 landsvæði – formlegt TCC inntökuskilyrði',
                },
                {
                    level: 'diamond',
                    threshold: 330,
                    description: 'Heimsótt öll 330 virk TCC landsvæði',
                },
            ],
            totalVisited,
        ),
    )

    // 2. Sögumaður — retired territories
    categories.push(
        computeCategory(
            'historian',
            'Sagnfræðingur',
            ICON_CLOCK,
            [
                { level: 'bronze', threshold: 1, description: 'Heimsótt eitt fyrrum TCC svæði' },
                { level: 'silver', threshold: 10, description: 'Heimsótt 10 fyrrum TCC svæði' },
                {
                    level: 'gold',
                    threshold: 27,
                    description: 'Heimsótt meira en helming fyrrum svæða',
                },
                {
                    level: 'platinum',
                    threshold: 54,
                    description: 'Heimsótt öll 54 fyrrum TCC svæði',
                },
            ],
            retiredVisited,
        ),
    )

    // 3–14. One per region
    // `labelDative` is the dative/locative form used in "Heimsótt X svæði í <labelDative>"
    const regionDefs: Array<{
        region: string
        id: string
        label: string
        labelDative: string
        icon: string
    }> = [
        {
            region: 'Europe & Mediterranean',
            id: 'region-europe',
            label: 'Evrópa & Miðjarðarhaf',
            labelDative: 'Evrópu & Miðjarðarhafi',
            icon: ICON_EUROPE,
        },
        {
            region: 'Africa',
            id: 'region-africa',
            label: 'Afríka',
            labelDative: 'Afríku',
            icon: ICON_AFRICA,
        },
        {
            region: 'Asia',
            id: 'region-asia',
            label: 'Asía',
            labelDative: 'Asíu',
            icon: ICON_ASIA,
        },
        {
            region: 'Pacific Ocean',
            id: 'region-pacific',
            label: 'Kyrrahaf',
            labelDative: 'Kyrrahafi',
            icon: ICON_PACIFIC,
        },
        {
            region: 'Caribbean',
            id: 'region-caribbean',
            label: 'Karabíahaf',
            labelDative: 'Karabíahafi',
            icon: ICON_CARIBBEAN,
        },
        {
            region: 'Middle East',
            id: 'region-middleeast',
            label: 'Miðausturlönd',
            labelDative: 'Miðausturlöndum',
            icon: ICON_MIDDLEEAST,
        },
        {
            region: 'Indian Ocean',
            id: 'region-indian',
            label: 'Indlandshaf',
            labelDative: 'Indlandshafi',
            icon: ICON_INDIAN,
        },
        {
            region: 'Atlantic Ocean',
            id: 'region-atlantic',
            label: 'Atlantshaf',
            labelDative: 'Atlantshafi',
            icon: ICON_ATLANTIC,
        },
        {
            region: 'South America',
            id: 'region-southamerica',
            label: 'Suður-Ameríka',
            labelDative: 'Suður-Ameríku',
            icon: ICON_SOUTHAMERICA,
        },
        {
            region: 'Antarctica',
            id: 'region-antarctica',
            label: 'Suðurskautssvæðið',
            labelDative: 'Suðurskautssvæðinu',
            icon: ICON_ANTARCTICA,
        },
        {
            region: 'Central America',
            id: 'region-centralamerica',
            label: 'Mið-Ameríka',
            labelDative: 'Mið-Ameríku',
            icon: ICON_CENTRALAMERICA,
        },
        {
            region: 'North America',
            id: 'region-northamerica',
            label: 'Norður-Ameríka',
            labelDative: 'Norður-Ameríku',
            icon: ICON_NORTHAMERICA,
        },
    ]

    for (const def of regionDefs) {
        const total = regionTotal.get(def.region) ?? 0
        const got = regionVisitedActive.get(def.region) ?? 0
        const t25 = Math.max(1, Math.ceil(total * 0.25))
        const t50 = Math.ceil(total * 0.5)

        const tiers: BadgeTierDef[] = [
            {
                level: 'bronze',
                threshold: 1,
                description: `Heimsótt 1 svæði í ${def.labelDative}`,
            },
        ]
        if (t25 > 1) {
            tiers.push({
                level: 'silver',
                threshold: t25,
                description: `Heimsótt 25% svæða í ${def.labelDative}`,
            })
        }
        if (t50 > t25) {
            tiers.push({
                level: 'gold',
                threshold: t50,
                description: `Heimsótt helming svæða í ${def.labelDative}`,
            })
        }
        if (total > t50) {
            tiers.push({
                level: 'platinum',
                threshold: total,
                description: `Heimsótt öll svæði í ${def.labelDative}`,
            })
        }

        categories.push(computeCategory(def.id, def.label, def.icon, tiers, got))
    }

    return categories
}
