import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabase'

type AuthListener = (user: User | null) => void

let currentUser: User | null = null
const listeners = new Set<AuthListener>()

export const authStore = {
  get user() {
    return currentUser
  },

  subscribe(fn: AuthListener): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}

function notify() {
  listeners.forEach(fn => fn(currentUser))
}

// Initialize from existing session and listen for changes
supabase.auth.getSession().then(({ data }) => {
  currentUser = data.session?.user ?? null
  notify()
})

supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
  currentUser = session?.user ?? null
  notify()
  if (event === 'SIGNED_OUT') {
    history.pushState(null, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
  if (event === 'PASSWORD_RECOVERY') {
    history.pushState(null, '', '/reset-password')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
})
