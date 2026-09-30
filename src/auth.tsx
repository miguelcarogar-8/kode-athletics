import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { AuthScreen } from './AuthScreen'
import { supabase } from './supabase'
import './AuthScreen.css'

interface AuthContextValue {
  user: User
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function displayName(user: User): string {
  const meta = user.user_metadata
  const name = meta.full_name ?? meta.name
  if (typeof name === 'string' && name.trim()) return name.trim()
  return user.email ?? 'Cuenta'
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth solo se usa dentro de la sesión')
  return value
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(supabase == null)

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setReady(true)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  if (!ready) {
    return (
      <main className="auth">
        <p className="auth__status">Cargando…</p>
      </main>
    )
  }

  if (!session) return <AuthScreen />

  return (
    <AuthContext.Provider
      value={{
        user: session.user,
        signOut: async () => {
          await supabase?.auth.signOut()
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
