import { useState, type FormEvent } from 'react'
import { supabase } from './supabase'
import './AuthScreen.css'

type Mode = 'login' | 'register'

export function AuthScreen({ initialNotice = null }: { initialNotice?: string | null }) {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(initialNotice)
  const [busy, setBusy] = useState(false)

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setNotice(null)
    const cleanEmail = email.trim()
    const cleanName = name.trim()
    if (!cleanEmail.includes('@')) {
      setError('Escribe un email válido.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña necesita al menos 6 caracteres.')
      return
    }
    if (mode === 'register') {
      if (cleanName.length < 2) {
        setError('Escribe tu nombre.')
        return
      }
      if (password !== repeat) {
        setError('Las contraseñas no coinciden.')
        return
      }
    }
    if (!supabase) {
      setError('Faltan las claves de Supabase en el entorno.')
      return
    }

    setBusy(true)
    if (mode === 'login') {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })
      setBusy(false)
      if (authError) setError(loginMessage(authError.message))
      return
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { full_name: cleanName },
        emailRedirectTo: window.location.origin,
      },
    })
    setBusy(false)
    if (authError) {
      setError(authError.message)
      return
    }
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      setError('Ese email ya está registrado. Entra con tu contraseña.')
      return
    }
    if (!data.session) {
      setNotice('Te hemos enviado un correo para confirmar la cuenta. Luego ya puedes entrar.')
      setMode('login')
      setPassword('')
      setRepeat('')
    }
  }

  return (
    <main className="auth">
      <p className="brand">
        <img src="/kode-athletics-mark.jpeg" alt="" width={128} height={128} />
        <span className="brand__wordmark">
          <span className="brand__kode">Kode</span> <span className="brand__athletics">Athletics</span>
        </span>
      </p>

      <section className="auth__card">
        <h1>Empieza a utilizar Kode Athletics</h1>
        <p>Entra con tu email para simular un WOD o anotar tus marcas.</p>

        <div className="auth__modes">
          <button
            type="button"
            className={mode === 'login' ? 'is-on' : undefined}
            onClick={() => switchMode('login')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'is-on' : undefined}
            onClick={() => switchMode('register')}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={(event) => void onSubmit(event)}>
          {mode === 'register' ? (
            <label>
              Nombre
              <input
                value={name}
                autoComplete="name"
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          ) : null}
          <label>
            Email
            <input
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {mode === 'register' ? (
            <label>
              Repite la contraseña
              <input
                type="password"
                value={repeat}
                autoComplete="new-password"
                onChange={(event) => setRepeat(event.target.value)}
              />
            </label>
          ) : null}
          {error ? <p className="auth__error">{error}</p> : null}
          {notice ? <p className="auth__notice">{notice}</p> : null}
          <button type="submit" className="auth__submit" disabled={busy}>
            {mode === 'register' ? 'Crear cuenta' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}

function loginMessage(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login')) return 'Email o contraseña incorrectos.'
  if (lower.includes('email not confirmed')) return 'Confirma el correo antes de entrar.'
  return message
}
