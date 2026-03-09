import { supabase } from '../supabase'
import { authStore } from '../auth/authStore'
import { navigateTo } from '../router'
import { territories } from '../data/territories'
import { esc } from '../utils'
import { navbar, initNavHamburger } from '../components/nav'

type RankRow = {
    user_id: string
    display_name: string
    country_count: number
    rank: number
}

export const LeaderboardDetailPage = {
    render(params: Record<string, string>): HTMLElement {
        const el = document.createElement('div')
        const user = authStore.user!
        const lbId = params['id']

        el.innerHTML = `
      ${navbar('leaderboards', user.id)}
      <div class="page-content">
        <div id="lb-header" class="page-header">
          <h1 id="lb-name">Hleður…</h1>
        </div>
        <div id="rankings" class="rankings">Hleður…</div>
        <div class="invite-section">
          <h2>Boðstengill</h2>
          <div class="invite-row">
            <input id="invite-url" type="text" readonly />
            <button id="copy-btn">Afrita</button>
          </div>
          <p class="muted">Allir með þennan tengi geta tekið þátt í stigatöflunni.</p>
        </div>
        <div id="owner-actions"></div>
      </div>
    `

        const rankingsEl = el.querySelector('#rankings') as HTMLElement
        const lbNameEl = el.querySelector('#lb-name') as HTMLElement
        const inviteInput = el.querySelector('#invite-url') as HTMLInputElement
        const ownerActionsEl = el.querySelector('#owner-actions') as HTMLElement

        el.querySelector('#copy-btn')!.addEventListener('click', () => {
            navigator.clipboard.writeText(inviteInput.value).then(() => {
                const btn = el.querySelector('#copy-btn') as HTMLButtonElement
                btn.textContent = 'Afritað!'
                setTimeout(() => {
                    btn.textContent = 'Afrita'
                }, 2000)
            })
        })

        async function loadLeaderboard() {
            const { data: lb, error: lbErr } = await supabase
                .from('leaderboards')
                .select('id, name, description, owner_id, invite_token')
                .eq('id', lbId)
                .single()

            if (lbErr || !lb) {
                rankingsEl.textContent = 'Stigatafla fannst ekki.'
                return
            }

            lbNameEl.textContent = lb.name
            inviteInput.value = `${window.location.origin}/join?token=${lb.invite_token}`

            if (lb.owner_id === user.id) {
                ownerActionsEl.innerHTML = `
          <div class="danger-section">
            <button id="delete-lb" class="btn-danger">Eyða stigatöflu</button>
          </div>
        `
                ownerActionsEl.querySelector('#delete-lb')!.addEventListener('click', async () => {
                    if (!confirm(`Eyða "${lb.name}"? Þetta er óafturkræft.`)) return
                    await supabase.from('leaderboards').delete().eq('id', lbId)
                    navigateTo('/leaderboards')
                })
            } else {
                ownerActionsEl.innerHTML = `
          <div class="danger-section">
            <button id="leave-lb" class="btn-danger">Yfirgefa stigatöflu</button>
          </div>
        `
                ownerActionsEl.querySelector('#leave-lb')!.addEventListener('click', async () => {
                    if (!confirm(`Yfirgefa "${lb.name}"?`)) return
                    await supabase
                        .from('leaderboard_members')
                        .delete()
                        .eq('leaderboard_id', lbId)
                        .eq('user_id', user.id)
                    navigateTo('/leaderboards')
                })
            }

            await loadRankings()
        }

        async function loadRankings() {
            const { data, error } = await supabase
                .from('leaderboard_rankings')
                .select('user_id, display_name, country_count, rank')
                .eq('leaderboard_id', lbId)
                .order('rank')

            if (error) {
                rankingsEl.textContent = error.message
                return
            }

            const rows = (data ?? []) as RankRow[]
            if (rows.length === 0) {
                rankingsEl.innerHTML = '<p class="muted">Engir meðlimir enn.</p>'
                return
            }

            rankingsEl.innerHTML = `
        <table class="rankings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Notandi</th>
              <th>Lönd & svæði</th>
            </tr>
          </thead>
          <tbody>
            ${rows
                .map(
                    (r) => `
              <tr class="${r.user_id === user.id ? 'current-user' : ''}">
                <td class="rank-cell">${r.rank}</td>
                <td><a href="/profile/${r.user_id}">${esc(r.display_name)}</a></td>
                <td>${r.country_count} / ${territories.length}</td>
              </tr>
            `,
                )
                .join('')}
          </tbody>
        </table>
      `
        }

        loadLeaderboard()

        supabase
            .channel(`lb-${lbId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'visits',
                },
                () => loadRankings(),
            )
            .subscribe()

        initNavHamburger(el)
        return el
    },

    destroy() {},
}
