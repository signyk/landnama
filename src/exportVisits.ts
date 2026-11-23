import { supabase } from './supabase'
import { allTerritories } from './data/territories'

function csvField(value: string): string {
    return `"${value.replace(/"/g, '""')}"`
}

/** Downloads the user's visited territories as a CSV file. Returns the Supabase error, if any. */
export async function downloadVisitsCsv(userId: string) {
    const { data, error } = await supabase
        .from('visits')
        .select('country_code, created_at')
        .eq('user_id', userId)
    if (error) return error

    const addedAt = new Map(data.map((v) => [v.country_code, v.created_at.slice(0, 10)]))
    const rows = allTerritories
        .filter((t) => addedAt.has(t.id))
        .map((t) => [t.name, t.region, addedAt.get(t.id)!])

    const lines = [['Heiti', 'Heimshluti', 'Skráð'], ...rows].map((r) => r.map(csvField).join(','))
    // BOM so Excel reads the file as UTF-8 (Icelandic characters)
    const blob = new Blob(['\uFEFF' + lines.join('\r\n') + '\r\n'], {
        type: 'text/csv;charset=utf-8',
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `landnama-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    return null
}
