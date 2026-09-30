import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { EmailOtpType, Session, User } from '@supabase/supabase-js'
import { AuthScreen } from './AuthScreen'
import { supabase } from './supabase'
import './AuthScreen.css'

const OTP_TYPES = new Set<EmailOtpType>(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'])

const USED_LINK =
  'El enlace de confirmación ya no vale. La cuenta sí puede estar creada: entra con tu email y contraseña.'

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
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let active = true
    const client = supabase

    const boot = async () => {
      const confirm = readConfirmParams()
      if (confirm) {
        const { error } = await client.auth.verifyOtp({
          token_hash: confirm.tokenHash,
          type: confirm.type,
        })
        if (!active) return
        clearAuthParams()
        if (error) setNotice(USED_LINK)
      } else if (linkWasRejected()) {
        clearAuthParams()
        setNotice(USED_LINK)
      }

      const { data } = await client.auth.getSession()
      if (!active) return
      setSession(data.session)
      setReady(true)
    }

    void boot()
    const { data } = client.auth.onAuthStateChange((_event, next) => {
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

  if (!session) return <AuthScreen initialNotice={notice} />

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

function readConfirmParams(): { tokenHash: string; type: EmailOtpType } | null {
  const params = new URLSearchParams(window.location.search)
  const tokenHash = params.get('token_hash')
  const type = params.get('type')
  if (!tokenHash || !type || !OTP_TYPES.has(type as EmailOtpType)) return null
  return { tokenHash, type: type as EmailOtpType }
}

function linkWasRejected(): boolean {
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const code = query.get('error_code') ?? hash.get('error_code')
  const error = query.get('error') ?? hash.get('error')
  return code === 'otp_expired' || error === 'access_denied'
}

function clearAuthParams() {
  const url = new URL(window.location.href)
  for (const key of ['token_hash', 'type', 'error', 'error_code', 'error_description', 'code']) {
    url.searchParams.delete(key)
  }
  url.hash = ''
  const next = `${url.pathname}${url.search}`
  window.history.replaceState(null, '', next)
}
