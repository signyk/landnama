import { supabase } from '../supabase'
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
          <a href="/leaderboards/new" class="btn">+ Ný</a>
        </div>
        <div id="list">Hleður…</div>
      </div>
    `

    const listEl = el.querySelector('#list') as HTMLElement

    supabase
      .from('leaderboard_members')
      .select('leaderboard_id, leaderboards(id, name, description, owner_id)')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) {
          listEl.textContent = error.message
          return
        }
        if (!data || data.length === 0) {
          listEl.innerHTML = `<p class="muted">Engar stigatöflur enn. <a href="/leaderboards/new">Búa til</a> eða taktu þátt í stigatöflu með boðstengli.</p>`
          return
        }

        listEl.innerHTML = ''
        data.forEach(row => {
          const lb = row.leaderboards as unknown as { id: string; name: string; description: string | null; owner_id: string }
          if (!lb) return
          const card = document.createElement('a')
          card.href = `/leaderboards/${lb.id}`
          card.className = 'lb-card'
          card.innerHTML = `
            <span class="lb-name">${esc(lb.name)}</span>
            ${lb.description ? `<span class="lb-desc">${esc(lb.description)}</span>` : ''}
            ${lb.owner_id === user.id ? '<span class="lb-badge">Eigandi</span>' : ''}
          `
          listEl.appendChild(card)
        })
      })

    initNavHamburger(el)
    return el
  },
}
