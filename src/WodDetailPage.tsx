import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import {
  addWodScore,
  deleteWod,
  deleteWodScore,
  formatWodKind,
  getWod,
  type WodDetail,
  type WodType,
} from './wodsApi'

function prescriptionRounds(wod: WodDetail): { number: number; exercises: WodDetail['exercises'] }[] {
  const groups = new Map<number, WodDetail['exercises']>()
  for (const exercise of wod.exercises) {
    const number = exercise.round || 1
    const list = groups.get(number) ?? []
    list.push(exercise)
    groups.set(number, list)
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([number, exercises]) => ({ number, exercises }))
}

function todayInputValue(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function formatPerformedAt(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function barHeight(type: WodType, value: number, best: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(best) || best <= 0 || value <= 0) return 12
  const ratio = type === 'for_time' ? best / value : value / best
  return Math.max(12, Math.round(ratio * 100))
}

export function WodDetailPage() {
  const { wodId = '' } = useParams()
  const navigate = useNavigate()
  const [wod, setWod] = useState<WodDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [performedAt, setPerformedAt] = useState(todayInputValue)
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')
  const [rounds, setRounds] = useState('')
  const [reps, setReps] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!wodId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const detail = await getWod(wodId)
        if (!cancelled) setWod(detail)
      } catch (err) {
        if (!cancelled) {
          setWod(null)
          setError(err instanceof Error ? err.message : 'No se pudo cargar el WOD')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [wodId])

  const saveScore = async (event: FormEvent) => {
    event.preventDefault()
    if (!wod) return
    setError(null)
    const payload: {
      performedAt: string
      elapsedSec?: number
      rounds?: number
      reps?: number
      notes?: string
    } = { performedAt }
    if (notes.trim()) payload.notes = notes.trim()

    if (wod.type === 'for_time') {
      const min = Number(minutes)
      const sec = Number(seconds)
      if (
        minutes.trim() === '' ||
        seconds.trim() === '' ||
        !Number.isInteger(min) ||
        !Number.isInteger(sec) ||
        min < 0 ||
        sec < 0 ||
        sec > 59
      ) {
        setError('Indica minutos y segundos (los segundos, de 0 a 59).')
        return
      }
      const elapsedSec = min * 60 + sec
      if (elapsedSec < 1) {
        setError('El tiempo tiene que ser mayor que cero.')
        return
      }
      payload.elapsedSec = elapsedSec
    } else if (wod.type === 'amrap') {
      const roundCount = Number(rounds)
      const repCount = reps.trim() === '' ? 0 : Number(reps)
      if (!Number.isInteger(roundCount) || roundCount < 0) {
        setError('Indica las rondas.')
        return
      }
      if (!Number.isInteger(repCount) || repCount < 0) {
        setError('Las repeticiones extra tienen que ser un número.')
        return
      }
      if (roundCount === 0 && repCount === 0) {
        setError('Indica rondas o repeticiones.')
        return
      }
      payload.rounds = roundCount
      payload.reps = repCount
    } else {
      const repCount = Number(reps)
      if (reps.trim() === '' || !Number.isInteger(repCount) || repCount < 0) {
        setError('Indica las repeticiones hechas.')
        return
      }
      payload.reps = repCount
    }

    setSaving(true)
    try {
      const detail = await addWodScore(wod.id, payload)
      setWod(detail)
      setMinutes('')
      setSeconds('')
      setRounds('')
      setReps('')
      setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la marca')
    } finally {
      setSaving(false)
    }
  }

  const removeScore = async (scoreId: number) => {
    if (!wod) return
    if (!window.confirm('¿Quitar esta marca?')) return
    setError(null)
    try {
      setWod(await deleteWodScore(wod.id, scoreId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar la marca')
    }
  }

  const removeWod = async () => {
    if (!wod) return
    if (!window.confirm(`¿Eliminar ${wod.name} y todas sus marcas?`)) return
    try {
      await deleteWod(wod.id)
      navigate('/wods')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el WOD')
    }
  }

  if (loading) {
    return (
      <main className="wods">
        <p>Cargando…</p>
      </main>
    )
  }

  return (
    <main className="wods">
      <AppHeader
        actions={
          <>
            {wod ? (
              <button type="button" className="wods__danger" onClick={() => void removeWod()}>
                Eliminar
              </button>
            ) : null}
            <Link to="/wods" className="wods__back">
              WODs
            </Link>
          </>
        }
      />

      {error ? (
        <p className="wods__error" role="alert">
          {error}
        </p>
      ) : null}

      {!wod ? <p className="wods__muted">No se encontró el WOD.</p> : null}

      {wod ? (
        <>
          <section className="wods__hero">
            <h1>{wod.name}</h1>
            <p>
              {formatWodKind(wod.type, wod.timeCapSec, wod.rounds)}
              {wod.notes ? ` · ${wod.notes}` : ''}
            </p>
          </section>

          {prescriptionRounds(wod).map((round) => (
            <section className="wods__prescription-round" key={round.number}>
              {prescriptionRounds(wod).length > 1 ? <h2>Ronda {round.number}</h2> : null}
              <ol className="wods__prescription">
                {round.exercises.map((exercise) => (
                  <li key={exercise.id}>
                    <strong>{exercise.name}</strong>
                    <span>{exercise.reps}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}

          <section className="wods__progress" aria-label="Mejor marca">
            <p>Mejor marca</p>
            <strong>{wod.bestLabel ?? 'Sin marcas'}</strong>
            <em>
              {wod.sinceFirstLabel ??
                (wod.scores.length === 0
                  ? 'Anota el tiempo o las repeticiones de la primera vez.'
                  : 'Añade otra marca para ver si mejoras.')}
            </em>
            {wod.scores.length > 1 ? (
              <div className="wods__bars" aria-hidden="true">
                {wod.scores.map((score) => {
                  const best =
                    wod.type === 'for_time'
                      ? Math.min(...wod.scores.map((item) => item.value))
                      : Math.max(...wod.scores.map((item) => item.value))
                  return (
                    <span
                      key={score.id}
                      className={score.isBest ? 'is-best' : undefined}
                      style={{ height: `${barHeight(wod.type, score.value, best)}%` }}
                    />
                  )
                })}
              </div>
            ) : null}
          </section>

          <form className="wods__form" onSubmit={(event) => void saveScore(event)}>
            <h2>Añadir marca</h2>
            <label className="wods__field">
              Fecha
              <input
                type="date"
                value={performedAt}
                required
                onChange={(event) => setPerformedAt(event.target.value)}
              />
            </label>

            {wod.type === 'for_time' ? (
              <div className="wods__pair">
                <label className="wods__field">
                  Minutos
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={minutes}
                    onChange={(event) => setMinutes(event.target.value)}
                  />
                </label>
                <label className="wods__field">
                  Segundos
                  <input
                    type="number"
                    min={0}
                    max={59}
                    inputMode="numeric"
                    value={seconds}
                    onChange={(event) => setSeconds(event.target.value)}
                  />
                </label>
              </div>
            ) : null}

            {wod.type === 'amrap' ? (
              <div className="wods__pair">
                <label className="wods__field">
                  Rondas
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={rounds}
                    onChange={(event) => setRounds(event.target.value)}
                  />
                </label>
                <label className="wods__field">
                  Repeticiones extra
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={reps}
                    onChange={(event) => setReps(event.target.value)}
                  />
                </label>
              </div>
            ) : null}

            {wod.type === 'emom' ? (
              <label className="wods__field">
                Repeticiones hechas
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={reps}
                  onChange={(event) => setReps(event.target.value)}
                />
              </label>
            ) : null}

            <label className="wods__field">
              Nota (opcional)
              <input value={notes} maxLength={500} onChange={(event) => setNotes(event.target.value)} />
            </label>

            <button type="submit" className="wods__primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar marca'}
            </button>
          </form>

          <section className="wods__block">
            <h2>Marcas</h2>
            {wod.scores.length === 0 ? (
              <p className="wods__muted">Todavía no hay marcas en este WOD.</p>
            ) : (
              <ul className="wods__scores">
                {[...wod.scores].reverse().map((score) => (
                  <li key={score.id} className={score.isBest ? 'is-best' : undefined}>
                    <div>
                      <strong>{score.label}</strong>
                      <small>{formatPerformedAt(score.performedAt)}</small>
                      {score.deltaLabel ? (
                        <em
                          className={`wods__delta ${
                            score.improved === true ? 'is-better' : score.improved === false ? 'is-worse' : 'is-same'
                          }`}
                        >
                          {score.deltaLabel}
                        </em>
                      ) : null}
                      {score.notes ? <span className="wods__note">{score.notes}</span> : null}
                    </div>
                    {score.isBest ? <span className="wods__badge">Mejor</span> : <span />}
                    <button type="button" className="wods__ghost" onClick={() => void removeScore(score.id)}>
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </main>
  )
}
