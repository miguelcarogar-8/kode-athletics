import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { displayName, useAuth } from './auth'

export function AppHeader({ actions }: { actions?: ReactNode }) {
  const { user, signOut } = useAuth()
  return (
    <header className="wods__header">
      <Link to="/" className="brand">
        <img src="/kode-athletics-mark.jpeg" alt="" width={128} height={128} />
        <span className="brand__wordmark">
          <span className="brand__kode">Kode</span> <span className="brand__athletics">Athletics</span>
        </span>
      </Link>
      <div className="metcon__account">
        {actions}
        <span>{displayName(user)}</span>
        <button type="button" className="wods__ghost" onClick={() => void signOut()}>
          Salir
        </button>
      </div>
    </header>
  )
}
