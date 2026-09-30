import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { countLabel, formatWodKind, listWods, type WodSummary } from './wodsApi'

export function WodsPage() {
  const navigate = useNavigate()
  const [wods, setWods] = useState<WodSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const rows = await listWods()
        if (!cancelled) setWods(rows)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar los metcons')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="wods">
      <AppHeader
        actions={
          <>
            <button type="button" className="wods__primary" onClick={() => navigate('/wods/nuevo')}>
              Nuevo metcon
            </button>
            <Link to="/" className="wods__back">
              Inicio
            </Link>
          </>
        }
      />

      <section className="wods__hero">
        <h1>Metcons y marcas</h1>
        <p>
          Crea un metcon for time, AMRAP o EMOM y anota la marca cada vez que lo repitas. El tiempo
          baja o las repeticiones suben: así ves si has mejorado.
        </p>
      </section>

      {error ? (
        <p className="wods__error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <p className="wods__muted">Cargando metcons…</p> : null}

      {!loading && !error && wods.length === 0 ? (
        <p className="wods__muted">
          Todavía no hay metcons. Crea uno y, cada vez que lo hagas, guarda el tiempo o las
          repeticiones.
        </p>
      ) : null}

      {wods.length > 0 ? (
        <ul className="wods__list">
          {wods.map((wod) => (
            <li key={wod.id}>
              <button type="button" onClick={() => navigate(`/wods/${wod.id}`)}>
                <span>
                  <strong>{wod.name}</strong>
                  <small>
                    {formatWodKind(wod.type, wod.timeCapSec, wod.roundCount)}
                    {' · '}
                    {countLabel(wod.exerciseCount, 'ejercicio', 'ejercicios')}
                    {' · '}
                    {countLabel(wod.scoreCount, 'marca', 'marcas')}
                  </small>
                </span>
                <em>{wod.bestLabel ?? 'Sin marcas'}</em>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  )
}
