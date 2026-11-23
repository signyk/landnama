import { supabase } from '../supabase'
import { errorMessage } from '../errorMessages'
import { logError } from '../errorLog'
import { authStore } from '../auth/authStore'
import { esc } from '../utils'
import { navbar, initNavHamburger } from '../components/nav'

export const LeaderboardListPage = {
    render(_params: Record<string, string>): HTMLElement {
        const el = document.createElement('div')
        const user = authStore.user!

        el.innerHTML = `
      ${navbar('leaderboards', user.id)}
      <div class="page-content">
        <div class="page-header">
          <h1>Stigatöflur</h1>
          <a href="/leaderboards/new" class="btn-primary">+ Ný</a>
        </div>
        <div id="list">Hleður…</div>
      </div>
    `

        const listEl = el.querySelector('#list') as HTMLElement

        type Board = { id: string; name: string; description: string | null; owner_id: string }
        type Ranking = {
            leaderboard_id: string
            user_id: string
            display_name: string | null
            country_count: number
            rank: number
        }

        async function load() {
            const { data, error } = await supabase
                .from('leaderboard_members')
                .select('leaderboards(id, name, description, owner_id)')
                .eq('user_id', user.id)
            if (error) {
                listEl.textContent = errorMessage('load leaderboards', error)
                return
            }
            const boards = (data ?? [])
                .map((row) => row.leaderboards as unknown as Board | null)
                .filter((lb): lb is Board => !!lb)
            if (boards.length === 0) {
                listEl.innerHTML = `<p class="muted">Engar stigatöflur enn. <a href="/leaderboards/new">Búa til</a> eða taktu þátt í stigatöflu með boðstengli.</p>`
                return
            }

            // The cards still work without standings, so a failure here only logs
            const { data: rankings, error: rankError } = await supabase
                .from('leaderboard_rankings')
                .select('leaderboard_id, user_id, display_name, country_count, rank')
                .in(
                    'leaderboard_id',
                    boards.map((lb) => lb.id),
                )
                .order('rank')
            if (rankError) logError('load leaderboard standings', rankError)

            listEl.innerHTML = boards
                .map((lb) => {
                    const rows = ((rankings ?? []) as Ranking[]).filter(
                        (r) => r.leaderboard_id === lb.id,
                    )
                    const me = rows.find((r) => r.user_id === user.id)
                    const shown = rows.slice(0, 3)
                    if (me && !shown.includes(me)) shown.push(me)
                    return `
            <a class="lb-card" href="/leaderboards/${lb.id}">
              <span class="lb-head">
                <span class="lb-name">${esc(lb.name)}</span>
                ${lb.owner_id === user.id ? '<span class="lb-badge">Eigandi</span>' : ''}
                <span class="lb-members">${rows.length} ${rows.length === 1 ? 'meðlimur' : 'meðlimir'}</span>
              </span>
              ${lb.description ? `<span class="lb-desc">${esc(lb.description)}</span>` : ''}
              <ol class="lb-standings">
                ${shown
                    .map(
                        (r) => `<li${r === me ? ' class="me"' : ''}>
                  <span class="lb-rank">${r.rank}.</span>
                  <span class="lb-who">${r === me ? 'Þú' : esc(r.display_name ?? 'Óþekktur notandi')}</span>
                  <span class="lb-count">${r.country_count}</span>
                </li>`,
                    )
                    .join('')}
              </ol>
            </a>`
                })
                .join('')
        }
        void load()

        initNavHamburger(el)
        return el
    },
}
