import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { SortablePieceList, createCardio, createExercise, reorderPieces } from './components/PieceCard'
import { CARDIO, clampRounds, exerciseDef, type MetconPiece } from './metconSim'
import { createWod, WOD_TYPES, type WodType } from './wodsApi'

function prescription(piece: MetconPiece): { name: string; reps: string; weightKg: number | null } {
  if (piece.kind === 'exercise') {
    return { name: exerciseDef(piece.exerciseId).name, reps: String(piece.reps), weightKg: piece.weightKg }
  }
  const label = CARDIO.find((item) => item.id === piece.cardio)?.label ?? 'Cardio'
  const reps = piece.mode === 'cal' ? `${piece.calories} cal` : `${piece.distanceM} m`
  return { name: label, reps, weightKg: null }
}

export function WodCreatePage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [type, setType] = useState<WodType>('for_time')
  const [timeCapMin, setTimeCapMin] = useState('')
  const [notes, setNotes] = useState('')
  const [pieces, setPieces] = useState<MetconPiece[]>([])
  const [rounds, setRounds] = useState(1)
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selected = WOD_TYPES.find((item) => item.id === type) ?? WOD_TYPES[0]
  const durationRequired = type === 'amrap' || type === 'emom'

  const openPiece = (piece: MetconPiece) => {
    setOpenIds((current) => new Set(current).add(piece.id))
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Ponle un nombre al WOD.')
      return
    }
    if (pieces.length === 0) {
      setError('Añade cardio o un ejercicio.')
      return
    }
    const cleanExercises = pieces.map((piece) => prescription(piece))
    if (cleanExercises.length > 40) {
      setError('El WOD no puede pasar de 40 movimientos.')
      return
    }
    const minutes = timeCapMin.trim() === '' ? null : Number(timeCapMin)
    if (durationRequired && (minutes == null || !Number.isInteger(minutes) || minutes < 1)) {
      setError('Indica la duración en minutos.')
      return
    }
    if (minutes != null && (!Number.isInteger(minutes) || minutes < 1 || minutes > 180)) {
      setError('La duración tiene que estar entre 1 y 180 minutos.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const created = await createWod({
        name: trimmed,
        type,
        ...(minutes != null ? { timeCapMin: minutes } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(type === 'for_time' ? { rounds } : {}),
        exercises: cleanExercises,
      })
      navigate(`/wods/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el WOD')
      setSaving(false)
    }
  }

  return (
    <main className="wods">
      <AppHeader
        actions={
          <Link to="/wods" className="wods__back">
            Volver
          </Link>
        }
      />

      <section className="wods__hero">
        <h1>Nuevo WOD</h1>
        <p>{selected.hint}</p>
      </section>

      {error ? (
        <p className="wods__error" role="alert">
          {error}
        </p>
      ) : null}

      <form className="wods__form wods__form--wide" onSubmit={(event) => void save(event)}>
        <label className="wods__field">
          Nombre
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
            placeholder="Fran"
          />
        </label>

        <label className="wods__field">
          Tipo
          <select value={type} onChange={(event) => setType(event.target.value as WodType)}>
            {WOD_TYPES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="wods__field">
          {type === 'for_time' ? 'Tiempo límite (min, opcional)' : 'Duración (min)'}
          <input
            type="number"
            min={1}
            max={180}
            inputMode="numeric"
            value={timeCapMin}
            required={durationRequired}
            placeholder={type === 'emom' ? '12' : '20'}
            onChange={(event) => setTimeCapMin(event.target.value)}
          />
        </label>

        <div className="wods__exercises">
          <h2>Ejercicios</h2>
          {type === 'for_time' ? (
            <div className="metcon__rounds">
              <span>Rondas</span>
              <div className="metcon__time-row">
                <button
                  type="button"
                  aria-label="Quitar una ronda"
                  disabled={rounds <= 1}
                  onClick={() => setRounds((current) => clampRounds(current - 1))}
                >
                  −
                </button>
                <strong>{rounds}</strong>
                <button
                  type="button"
                  aria-label="Añadir una ronda"
                  disabled={rounds >= 30}
                  onClick={() => setRounds((current) => clampRounds(current + 1))}
                >
                  +
                </button>
              </div>
            </div>
          ) : null}
          <MovementBlock
            pieces={pieces}
            openIds={openIds}
            onToggle={(id) =>
              setOpenIds((current) => {
                const next = new Set(current)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
              })
            }
            onChangePieces={setPieces}
            onAdd={(piece) => {
              openPiece(piece)
              setPieces((current) => [...current, piece])
            }}
          />
        </div>

        <label className="wods__field">
          Nota (opcional)
          <textarea value={notes} maxLength={500} onChange={(event) => setNotes(event.target.value)} />
        </label>

        <button type="submit" className="wods__primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar WOD'}
        </button>
      </form>
    </main>
  )
}

function MovementBlock({
  pieces,
  openIds,
  onToggle,
  onChangePieces,
  onAdd,
}: {
  pieces: MetconPiece[]
  openIds: ReadonlySet<string>
  onToggle: (id: string) => void
  onChangePieces: (pieces: MetconPiece[]) => void
  onAdd: (piece: MetconPiece) => void
}) {
  return (
    <>
      {pieces.length === 0 ? (
        <p className="wods__muted">Añade cardio o un ejercicio.</p>
      ) : (
        <SortablePieceList
          pieces={pieces}
          openIds={openIds}
          onToggle={onToggle}
          onChange={(next) => onChangePieces(pieces.map((piece) => (piece.id === next.id ? next : piece)))}
          onRemove={(id) => onChangePieces(pieces.filter((piece) => piece.id !== id))}
          onReorder={(fromId, toId) => onChangePieces(reorderPieces(pieces, fromId, toId))}
          timing={false}
        />
      )}
      <div className="metcon__add">
        <button type="button" className="wods__ghost" onClick={() => onAdd(createCardio())}>
          Añadir cardio
        </button>
        <button type="button" className="wods__ghost" onClick={() => onAdd(createExercise())}>
          Añadir ejercicio
        </button>
      </div>
    </>
  )
}
