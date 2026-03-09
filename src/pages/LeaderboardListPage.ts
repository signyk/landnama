import { supabase } from '../supabase'
import { authStore } from '../auth/authStore'
import { navigateTo } from '../router'

export const LeaderboardListPage = {
  render(_params: Record<string, string>): HTMLElement {
    const el = document.createElement('div')
    const user = authStore.user!

    el.innerHTML = `
      <nav class="navbar">
        <span class="nav-brand"><a href="/dashboard">Landnáma</a></span>
        <div class="nav-links">
          <a href="/dashboard">Kort</a>
          <button id="signout">Skrá út</button>
        </div>
      </nav>
      <div class="page-content">
        <div class="page-header">
          <h1>Stigatöflur</h1>
          <a href="/leaderboards/new" class="btn">+ Ný</a>
        </div>
        <div id="list">Hleður…</div>
      </div>
    `

    el.querySelector('#signout')!.addEventListener('click', async () => {
      await supabase.auth.signOut()
      navigateTo('/')
    })

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
            <span class="lb-name">${lb.name}</span>
            ${lb.description ? `<span class="lb-desc">${lb.description}</span>` : ''}
            ${lb.owner_id === user.id ? '<span class="lb-badge">Eigandi</span>' : ''}
          `
          listEl.appendChild(card)
        })
      })

    return el
  },
}
