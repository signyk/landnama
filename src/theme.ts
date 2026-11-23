type Theme = 'light' | 'dark'

const media = window.matchMedia('(prefers-color-scheme: dark)')
const root = document.documentElement
const systemTheme = (): Theme => (media.matches ? 'dark' : 'light')

// Choosing the system's own theme clears the stored choice, so the site follows the system again.
function toggleTheme(): void {
    const next: Theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
    root.dataset.theme = next
    try {
        if (next === systemTheme()) localStorage.removeItem('theme')
        else localStorage.setItem('theme', next)
    } catch {
        // Storage blocked: the choice lasts until reload
    }
}

media.addEventListener('change', () => {
    try {
        if (localStorage.getItem('theme')) return
    } catch {
        // Storage blocked: follow the system
    }
    root.dataset.theme = systemTheme()
})

export function initThemeToggle(scope: ParentNode): void {
    scope.querySelectorAll('.theme-toggle').forEach((btn) =>
        btn.addEventListener('click', (e) => {
            e.stopPropagation()
            toggleTheme()
        }),
    )
}
