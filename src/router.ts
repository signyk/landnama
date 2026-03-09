import { supabase } from './supabase'
import { authStore } from './auth/authStore'

type PageModule = {
    render: (params: Record<string, string>) => HTMLElement
    destroy?: () => void
}

type Route = {
    pattern: RegExp
    keys: string[]
    loader: () => Promise<PageModule>
    requiresAuth: boolean
}

const routes: Route[] = [
    {
        pattern: /^\/$/,
        keys: [],
        loader: () => import('./pages/LoginPage').then((m) => m.LoginPage),
        requiresAuth: false,
    },
    {
        pattern: /^\/register$/,
        keys: [],
        loader: () => import('./pages/RegisterPage').then((m) => m.RegisterPage),
        requiresAuth: false,
    },
    {
        pattern: /^\/home$/,
        keys: [],
        loader: () => import('./pages/DashboardPage').then((m) => m.DashboardPage),
        requiresAuth: true,
    },
    {
        pattern: /^\/leaderboards$/,
        keys: [],
        loader: () => import('./pages/LeaderboardListPage').then((m) => m.LeaderboardListPage),
        requiresAuth: true,
    },
    {
        pattern: /^\/leaderboards\/new$/,
        keys: [],
        loader: () => import('./pages/CreateLeaderboardPage').then((m) => m.CreateLeaderboardPage),
        requiresAuth: true,
    },
    {
        pattern: /^\/leaderboards\/([^/]+)$/,
        keys: ['id'],
        loader: () => import('./pages/LeaderboardDetailPage').then((m) => m.LeaderboardDetailPage),
        requiresAuth: true,
    },
    {
        pattern: /^\/profile\/([^/]+)$/,
        keys: ['uid'],
        loader: () => import('./pages/ProfilePage').then((m) => m.ProfilePage),
        requiresAuth: true,
    },
    {
        pattern: /^\/join$/,
        keys: [],
        loader: () => import('./pages/InviteAcceptPage').then((m) => m.InviteAcceptPage),
        requiresAuth: true,
    },
    {
        pattern: /^\/forgot-password$/,
        keys: [],
        loader: () => import('./pages/ForgotPasswordPage').then((m) => m.ForgotPasswordPage),
        requiresAuth: false,
    },
    {
        pattern: /^\/reset-password$/,
        keys: [],
        loader: () => import('./pages/ResetPasswordPage').then((m) => m.ResetPasswordPage),
        requiresAuth: false,
    },
    {
        pattern: /^\/um$/,
        keys: [],
        loader: () => import('./pages/AboutPage').then((m) => m.AboutPage),
        requiresAuth: false,
    },
]

const app = document.getElementById('app')!
let currentDestroy: (() => void) | undefined

async function navigate(path: string) {
    // Strip query string for route matching, keep it for params
    const [pathname, search] = path.split('?')
    const query = Object.fromEntries(new URLSearchParams(search ?? ''))

    const match = routes.find((r) => r.pattern.test(pathname))

    if (!match) {
        render404()
        return
    }

    if (match.requiresAuth && !authStore.user) {
        sessionStorage.setItem('redirectAfterAuth', path)
        history.replaceState(null, '', '/')
        navigate('/')
        return
    }

    // Redirect logged-in users away from auth pages
    if (!match.requiresAuth && authStore.user && pathname === '/') {
        history.replaceState(null, '', '/home')
        navigate('/home')
        return
    }

    const execResult = match.pattern.exec(pathname)!
    const params: Record<string, string> = { ...query }
    match.keys.forEach((key, i) => {
        params[key] = decodeURIComponent(execResult[i + 1] ?? '')
    })

    currentDestroy?.()
    currentDestroy = undefined

    const page = await match.loader()
    const el = page.render(params)
    app.innerHTML = ''
    app.appendChild(el)
    currentDestroy = page.destroy
}

function render404() {
    currentDestroy?.()
    currentDestroy = undefined
    app.innerHTML =
        '<div style="padding:2rem"><h1>404 — Page not found</h1><a href="/">Go home</a></div>'
}

// Handle browser back/forward
window.addEventListener('popstate', () => {
    navigate(location.pathname + location.search)
})

// Intercept internal link clicks
document.addEventListener('click', (e) => {
    const target = (e.target as Element).closest('a')
    if (!target) return
    const href = target.getAttribute('href')
    if (!href || href.startsWith('http') || href.startsWith('mailto')) return
    e.preventDefault()
    history.pushState(null, '', href)
    navigate(href)
})

export function navigateTo(path: string) {
    history.pushState(null, '', path)
    navigate(path)
}

// Boot
export async function initRouter() {
    // Wait for auth to be determined before first render
    await supabase_waitForSession()
    navigate(location.pathname + location.search)
}

async function supabase_waitForSession(): Promise<void> {
    await supabase.auth.getSession()
}
