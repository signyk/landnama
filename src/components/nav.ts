import { initThemeToggle } from '../theme'

type NavPage = 'home' | 'leaderboards' | 'about' | 'profile'

const icon = (cls: string, paths: string) =>
    `<svg class="${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`

const MOON = icon('when-light', '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>')
const SUN = icon(
    'when-dark',
    '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
)
const MENU = icon(
    'menu-icon',
    '<path class="bar-top" d="M4 7h16"/><path class="bar-mid" d="M4 12h16"/><path class="bar-bot" d="M4 17h16"/>',
)

export function navbar(active: NavPage | null, userId?: string): string {
    const link = (page: NavPage, href: string, label: string) =>
        page === active
            ? `<span class="nav-link-active">${label}</span>`
            : `<a href="${href}">${label}</a>`

    const profileLink = userId ? link('profile', `/profile/${userId}`, 'Prófíll') : ''

    const links = `
    ${link('home', '/home', 'Heim')}
    ${link('leaderboards', '/leaderboards', 'Stigatöflur')}
    ${profileLink}
    ${link('about', '/um', 'Um')}
  `

    return `
    <nav class="navbar">
      <span class="nav-brand"><a href="/home">Landnáma</a></span>
      <div class="nav-links">${links}</div>
      <div class="nav-actions">
        <button type="button" class="icon-btn theme-toggle nav-header-theme" aria-label="Skipta um útlit">${MOON}${SUN}</button>
        <button type="button" class="icon-btn nav-hamburger" id="nav-hamburger" aria-label="Valmynd" aria-expanded="false" aria-controls="nav-mobile-menu">${MENU}</button>
      </div>
      <div class="nav-mobile-menu hidden" id="nav-mobile-menu">
        ${links}
        <button type="button" class="theme-toggle nav-menu-theme">
          ${MOON}<span class="when-light">Dökkt útlit</span>
          ${SUN}<span class="when-dark">Ljóst útlit</span>
        </button>
      </div>
    </nav>
  `
}

export function initNavHamburger(el: HTMLElement): void {
    initThemeToggle(el)
    const hamburger = el.querySelector('#nav-hamburger') as HTMLButtonElement
    const mobileMenu = el.querySelector('#nav-mobile-menu') as HTMLElement
    if (!hamburger || !mobileMenu) return
    const setOpen = (open: boolean) => {
        mobileMenu.classList.toggle('hidden', !open)
        hamburger.setAttribute('aria-expanded', String(open))
    }
    hamburger.addEventListener('click', (e) => {
        e.stopPropagation()
        setOpen(mobileMenu.classList.contains('hidden'))
    })
    document.addEventListener('click', () => setOpen(false))
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setOpen(false)
    })
}
