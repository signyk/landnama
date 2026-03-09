import type { Territory } from './data/territories'
import { territories as activeTerritories, retiredTerritories } from './data/territories'

export type Badge = {
    id: string
    label: string
    description: string
    earned: boolean
    progress: number // 0–1
    progressDetail: string // e.g. "23 / 77"
}

const COUNT_THRESHOLDS: Array<{ count: number; id: string; label: string; description: string }> = [
    { count: 1, id: 'first', label: 'Fyrstu skref', description: 'Heimsótt 1 landsvæði' },
    { count: 10, id: 'ten', label: 'Farþegi', description: 'Heimsótt 10 landsvæði' },
    {
        count: 25,
        id: 'twenty-five',
        label: 'Útrásarvíkingur',
        description: 'Heimsótt 25 landsvæði',
    },
    { count: 50, id: 'fifty', label: 'Víðförull', description: 'Heimsótt 50 landsvæði' },
    {
        count: 100,
        id: 'tcc',
        label: 'TCC meðlimur',
        description: 'Heimsótt 100 landsvæði - formlegt TCC inntökuskilyrði',
    },
    { count: 200, id: 'two-hundred', label: 'Heimsfari', description: 'Heimsótt 200 landsvæði' },
    { count: 330, id: 'all', label: 'Allt!', description: 'Heimsótt öll 330 TCC landsvæði' },
    {
        count: 384,
        id: 'all-retired',
        label: 'Er meira?',
        description: 'Heimsótt öll 330 TCC landsvæði og öll 54 fyrrum svæði',
    },
]

const REGION_BADGES: Array<{ region: string; id: string; label: string; description: string }> = [
    {
        region: 'Europe & Mediterranean',
        id: 'region-europe',
        label: 'Evrópumeistari',
        description: 'Heimsótt öll Evrópusvæði',
    },
    {
        region: 'Africa',
        id: 'region-africa',
        label: 'Afríkumeistari',
        description: 'Heimsótt öll Afríkusvæði',
    },
    {
        region: 'Asia',
        id: 'region-asia',
        label: 'Asíumeistari',
        description: 'Heimsótt öll Asíusvæði',
    },
    {
        region: 'Pacific Ocean',
        id: 'region-pacific',
        label: 'Kyrrahafsmeistari',
        description: 'Heimsótt öll Kyrrahafsvæði',
    },
    {
        region: 'Caribbean',
        id: 'region-caribbean',
        label: 'Karabíahafsmeistari',
        description: 'Heimsótt öll Karabíahafssvæði',
    },
    {
        region: 'Middle East',
        id: 'region-middle-east',
        label: 'Mið-austurlandameistari',
        description: 'Heimsótt öll Miðausturlandasvæði',
    },
    {
        region: 'Indian Ocean',
        id: 'region-indian',
        label: 'Indlandshafsmeistari',
        description: 'Heimsótt öll Indlandshafssvæði',
    },
    {
        region: 'Atlantic Ocean',
        id: 'region-atlantic',
        label: 'Atlantshafsmeistari',
        description: 'Heimsótt öll Atlantshafssvæði',
    },
    {
        region: 'South America',
        id: 'region-south-america',
        label: 'Suður-Ameríkumeistari',
        description: 'Heimsótt öll Suður-Ameríkusvæði',
    },
    {
        region: 'Antarctica',
        id: 'region-antarctica',
        label: 'Suðurskautsmeistari',
        description: 'Heimsótt öll Suðurskautssvæði',
    },
    {
        region: 'Central America',
        id: 'region-central-america',
        label: 'Mið-Ameríkumeistari',
        description: 'Heimsótt öll Mið-Ameríkusvæði',
    },
    {
        region: 'North America',
        id: 'region-north-america',
        label: 'Norður-Ameríkumeistari',
        description: 'Heimsótt öll Norður-Ameríkusvæði',
    },
]

export function computeBadges(visited: Set<string>, allTerritories: Territory[]): Badge[] {
    const count = visited.size

    // Active-only totals (for earning region badges)
    const regionTotal = new Map<string, number>()
    for (const t of activeTerritories) {
        regionTotal.set(t.region, (regionTotal.get(t.region) ?? 0) + 1)
    }

    // Visited counts across all territories (active + retired) per region
    const regionVisited = new Map<string, number>()
    for (const t of allTerritories) {
        if (visited.has(t.id)) {
            regionVisited.set(t.region, (regionVisited.get(t.region) ?? 0) + 1)
        }
    }

    // Visited counts for active territories only (for earning check)
    const regionVisitedActive = new Map<string, number>()
    for (const t of activeTerritories) {
        if (visited.has(t.id)) {
            regionVisitedActive.set(t.region, (regionVisitedActive.get(t.region) ?? 0) + 1)
        }
    }

    const badges: Badge[] = []

    for (const b of COUNT_THRESHOLDS) {
        badges.push({
            id: b.id,
            label: b.label,
            description: b.description,
            earned: count >= b.count,
            progress: Math.min(count / b.count, 1),
            progressDetail: `${Math.min(count, b.count)} / ${b.count}`,
        })
    }

    for (const b of REGION_BADGES) {
        const total = regionTotal.get(b.region) ?? 0
        const gotActive = regionVisitedActive.get(b.region) ?? 0
        const gotAll = regionVisited.get(b.region) ?? 0
        badges.push({
            id: b.id,
            label: b.label,
            description: b.description,
            earned: total > 0 && gotActive >= total,
            progress: total > 0 ? Math.min(gotAll / total, 1) : 0,
            progressDetail: `${Math.min(gotAll, total)} / ${total}`,
        })
    }

    // Eldri borgari: at least 1 retired territory visited
    const retiredVisited = retiredTerritories.filter((t) => visited.has(t.id)).length
    badges.push({
        id: 'eldri-borgari',
        label: 'Eldri borgari',
        description: 'Heimsótt að minnsta kosti eitt fyrrum TCC svæði',
        earned: retiredVisited > 0,
        progress: Math.min(retiredVisited, 1),
        progressDetail: `${retiredVisited} / ${retiredTerritories.length}`,
    })

    // Diversity: at least 1 territory visited in every region
    const allRegions = [...regionTotal.keys()]
    const regionsWithVisits = allRegions.filter((r) => (regionVisited.get(r) ?? 0) > 0).length
    const allCovered = regionsWithVisits === allRegions.length
    badges.push({
        id: 'all-regions',
        label: 'Heimsborgari',
        description: 'Heimsótt svæði í öllum 12 heimshlutum',
        earned: allCovered,
        progress: allRegions.length > 0 ? Math.min(regionsWithVisits / allRegions.length, 1) : 0,
        progressDetail: `${regionsWithVisits} / ${allRegions.length}`,
    })

    return badges
}
