type NavPage = 'home' | 'leaderboards' | 'about' | 'profile'

export function navbar(active: NavPage, userId?: string): string {
  const link = (page: NavPage, href: string, label: string) =>
    page === active
      ? `<span class="nav-link-active">${label}</span>`
      : `<a href="${href}">${label}</a>`

  const profileLink = userId ? link('profile', `/profile/${userId}`, 'Prófíll') : ''

  const links = `
    ${link('home', '/dashboard', 'Heim')}
    ${link('leaderboards', '/leaderboards', 'Stigatöflur')}
    ${profileLink}
    ${link('about', '/um', 'Um')}
  `

  return `
    <nav class="navbar">
      <span class="nav-brand"><a href="/dashboard">Landnáma</a></span>
      <div class="nav-links">${links}</div>
      <button class="nav-hamburger" id="nav-hamburger" aria-label="Valmynd">&#9776;</button>
      <div class="nav-mobile-menu hidden" id="nav-mobile-menu">${links}</div>
    </nav>
  `
}

export function initNavHamburger(el: HTMLElement): void {
  const hamburger = el.querySelector('#nav-hamburger') as HTMLButtonElement
  const mobileMenu = el.querySelector('#nav-mobile-menu') as HTMLElement
  if (!hamburger || !mobileMenu) return
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation()
    mobileMenu.classList.toggle('hidden')
  })
  document.addEventListener('click', () => mobileMenu.classList.add('hidden'))
}
