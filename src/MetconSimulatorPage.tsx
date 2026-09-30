import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { displayName, useAuth } from './auth'
import {
  CARDIO,
  EXERCISE_GROUPS,
  EXERCISES,
  clampCap,
  clampPace,
  clampRounds,
  clampSeconds,
  emptyMetcon,
  exerciseDef,
  exerciseSeconds,
  formatClock,
  formatRange,
  formatRepSeconds,
  paceFit,
  paceFromSeconds,
  pieceLabel,
  piecePace,
  scaledSeconds,
  secondsFromPace,
  simulate,
  type CardioId,
  type CardioMode,
  type CardioPiece,
  type ExercisePiece,
  type MetconDraft,
  type MetconFormat,
  type MetconPiece,
  type PaceMode,
} from './metconSim'
import './MetconSimulatorPage.css'

const REP_PRESETS = [5, 10, 15, 21, 30]
const CALORIE_PRESETS = [10, 15, 20, 30]
const DISTANCE_PRESETS = [200, 400, 800, 1000]
const CAP_PRESETS = [8, 10, 12, 15, 20]

function newId(): string {
  return crypto.randomUUID()
}

function createCardio(): CardioPiece {
  return {
    id: newId(),
    kind: 'cardio',
    cardio: 'run',
    mode: 'distance',
    calories: 15,
    distanceM: 400,
    paceSecPerKm: 5 * 60,
    seconds: secondsFromPace(400, 5 * 60),
    transitionAfterSec: null,
  }
}

function createExercise(): ExercisePiece {
  const reps = 10
  const paceMode: PaceMode = 'pacing'
  return {
    id: newId(),
    kind: 'exercise',
    exerciseId: 'thruster',
    reps,
    paceMode,
    seconds: exerciseSeconds('thruster', reps, paceMode),
    transitionAfterSec: null,
  }
}

function reorderPieces(pieces: MetconPiece[], fromId: string, toId: string): MetconPiece[] {
  if (fromId === toId) return pieces
  const from = pieces.findIndex((piece) => piece.id === fromId)
  const to = pieces.findIndex((piece) => piece.id === toId)
  if (from < 0 || to < 0) return pieces
  const next = pieces.slice()
  const [item] = next.splice(from, 1)
  if (!item) return pieces
  next.splice(to, 0, item)
  return next
}

function replacePiece(pieces: MetconPiece[], nextPiece: MetconPiece): MetconPiece[] {
  return pieces.map((piece) => (piece.id === nextPiece.id ? nextPiece : piece))
}

export function MetconSimulatorPage() {
  const { user, signOut } = useAuth()
  const [draft, setDraft] = useState<MetconDraft>(emptyMetcon)
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())
  const result = simulate(draft.rounds, draft.pieces, {
    format: draft.format,
    capSec: draft.capSec,
  })
  const drag = useRef<{ from: string; over: string | null } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const togglePiece = (id: string) => {
    setOpenIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const addPiece = (piece: MetconPiece) => {
    setOpenIds((current) => new Set(current).add(piece.id))
    setPieces([...draft.pieces, piece])
  }

  const setFormat = (format: MetconFormat) => {
    setDraft((current) => ({ ...current, format }))
  }

  const setPieces = (pieces: MetconPiece[]) => {
    setDraft((current) => ({ ...current, pieces }))
  }

  const setTransition = (id: string, transitionAfterSec: number | null) => {
    setDraft((current) => ({
      ...current,
      pieces: current.pieces.map((piece) =>
        piece.id === id ? { ...piece, transitionAfterSec } : piece,
      ),
    }))
  }

  const moveBy = (id: string, direction: -1 | 1) => {
    setDraft((current) => {
      const index = current.pieces.findIndex((piece) => piece.id === id)
      const target = current.pieces[index + direction]
      if (!target) return current
      return { ...current, pieces: reorderPieces(current.pieces, id, target.id) }
    })
  }

  const onDragPointerDown = (event: ReactPointerEvent<HTMLSpanElement>, id: string) => {
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // The pointer may already be gone. The move and release listeners still run.
    }
    drag.current = { from: id, over: null }
    setDraggingId(id)
    setOverId(null)
  }

  const onDragPointerMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!drag.current) return
    const hit = document.elementFromPoint(event.clientX, event.clientY)
    const pieceId = hit?.closest<HTMLElement>('[data-piece-id]')?.dataset.pieceId ?? null
    const over = pieceId && pieceId !== drag.current.from ? pieceId : null
    drag.current.over = over
    setOverId(over)
  }

  const finishDrag = () => {
    const current = drag.current
    drag.current = null
    setDraggingId(null)
    setOverId(null)
    if (!current?.over) return
    setDraft((draftNow) => ({
      ...draftNow,
      pieces: reorderPieces(draftNow.pieces, current.from, current.over as string),
    }))
  }

  return (
    <main className="wods metcon">
      <header className="wods__header">
        <p className="brand">
          <img src="/kode-athletics-mark.jpeg" alt="" width={128} height={128} />
          <span className="brand__wordmark">
            <span className="brand__kode">Kode</span> <span className="brand__athletics">Athletics</span>
          </span>
        </p>
        <div className="metcon__account">
          <span>{displayName(user)}</span>
          <button type="button" className="wods__ghost" onClick={() => void signOut()}>
            Salir
          </button>
        </div>
      </header>

      <section className="wods__hero">
        <h1>Simulador de metcons</h1>
        <p>
          Elige For time o AMRAP, arma el bloque con cardio y ejercicios, arrastra cada parte para
          cambiar el orden y añade la transición entre una y otra.
        </p>
      </section>

      <div className="metcon__layout">
        <section className="metcon__builder">
          <div className="metcon__rounds">
            <span>Formato</span>
            <div className="metcon__chips">
              <button
                type="button"
                className={draft.format === 'fortime' ? 'is-on' : undefined}
                onClick={() => setFormat('fortime')}
              >
                For time
              </button>
              <button
                type="button"
                className={draft.format === 'amrap' ? 'is-on' : undefined}
                onClick={() => setFormat('amrap')}
              >
                AMRAP
              </button>
            </div>
          </div>

          {draft.format === 'amrap' ? (
            <div className="metcon__rounds">
              <span>Tiempo</span>
              <div className="metcon__cap">
                <div className="metcon__chips">
                  {CAP_PRESETS.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      className={minutes * 60 === draft.capSec ? 'is-on' : undefined}
                      onClick={() =>
                        setDraft((current) => ({ ...current, capSec: clampCap(minutes * 60) }))
                      }
                    >
                      {minutes} min
                    </button>
                  ))}
                </div>
                <TimeAdjuster
                  label=""
                  seconds={draft.capSec}
                  onChange={(capSec) => setDraft((current) => ({ ...current, capSec: clampCap(capSec) }))}
                />
              </div>
            </div>
          ) : (
          <div className="metcon__rounds">
            <span>Rondas</span>
            <div className="metcon__time-row">
              <button
                type="button"
                aria-label="Quitar una ronda"
                disabled={draft.rounds <= 1}
                onClick={() =>
                  setDraft((current) => ({ ...current, rounds: clampRounds(current.rounds - 1) }))
                }
              >
                −
              </button>
              <strong>{draft.rounds}</strong>
              <button
                type="button"
                aria-label="Añadir una ronda"
                disabled={draft.rounds >= 30}
                onClick={() =>
                  setDraft((current) => ({ ...current, rounds: clampRounds(current.rounds + 1) }))
                }
              >
                +
              </button>
            </div>
          </div>
          )}

          <ol className="metcon__pieces">
            {draft.pieces.map((piece, index) => {
              const isLast = index === draft.pieces.length - 1
              const repeats = draft.format === 'amrap' || draft.rounds > 1
              const showGap = !isLast || repeats || piece.transitionAfterSec != null
              const open = openIds.has(piece.id)
              const pace = piecePace(piece)
              return (
                <li
                  key={piece.id}
                  data-piece-id={piece.id}
                  className={
                    draggingId === piece.id ? 'is-dragging' : overId === piece.id ? 'is-over' : undefined
                  }
                  onDragOver={(event) => {
                    event.preventDefault()
                    const from = drag.current?.from
                    if (from && from !== piece.id) setOverId(piece.id)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    const from = event.dataTransfer.getData('text/plain') || drag.current?.from
                    drag.current = null
                    setDraggingId(null)
                    setOverId(null)
                    if (!from || from === piece.id) return
                    setDraft((draftNow) => ({
                      ...draftNow,
                      pieces: reorderPieces(draftNow.pieces, from, piece.id),
                    }))
                  }}
                >
                  <article className={open ? 'metcon__piece' : 'metcon__piece is-collapsed'}>
                    <header className="metcon__piece-head">
                      <span
                        className="metcon__handle"
                        role="button"
                        tabIndex={0}
                        draggable
                        aria-label="Arrastrar para reordenar"
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/plain', piece.id)
                          event.dataTransfer.effectAllowed = 'move'
                          drag.current = { from: piece.id, over: null }
                          setDraggingId(piece.id)
                        }}
                        onDragEnd={() => {
                          drag.current = null
                          setDraggingId(null)
                          setOverId(null)
                        }}
                        onPointerDown={(event) => {
                          if (event.pointerType === 'touch') onDragPointerDown(event, piece.id)
                        }}
                        onPointerMove={onDragPointerMove}
                        onPointerUp={finishDrag}
                        onPointerCancel={finishDrag}
                        onKeyDown={(event) => {
                          if (event.key === 'ArrowUp') {
                            event.preventDefault()
                            moveBy(piece.id, -1)
                          }
                          if (event.key === 'ArrowDown') {
                            event.preventDefault()
                            moveBy(piece.id, 1)
                          }
                        }}
                      >
                        ⋮⋮
                      </span>
                      {open ? (
                        <span>{piece.kind === 'cardio' ? 'Cardio' : 'Ejercicio'}</span>
                      ) : (
                        <button
                          type="button"
                          className="metcon__summary"
                          aria-expanded={false}
                          onClick={() => togglePiece(piece.id)}
                        >
                          <strong>{pieceLabel(piece)}</strong>
                          <em>
                            {formatClock(piece.seconds)}
                            {pace ? ` · ${pace}` : ''}
                          </em>
                        </button>
                      )}
                      <div className="metcon__piece-actions">
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-label={open ? 'Plegar' : 'Desplegar'}
                          onClick={() => togglePiece(piece.id)}
                        >
                          {open ? '▴' : '▾'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPieces(draft.pieces.filter((item) => item.id !== piece.id))
                          }
                        >
                          Quitar
                        </button>
                      </div>
                    </header>

                    {open && piece.kind === 'cardio' ? (
                      <CardioFields
                        piece={piece}
                        onChange={(next) => setPieces(replacePiece(draft.pieces, next))}
                      />
                    ) : null}
                    {open && piece.kind === 'exercise' ? (
                      <ExerciseFields
                        piece={piece}
                        onChange={(next) => setPieces(replacePiece(draft.pieces, next))}
                      />
                    ) : null}

                    {open ? (
                      <TimeAdjuster
                        seconds={piece.seconds}
                        onChange={(seconds) => {
                          if (piece.kind === 'cardio' && piece.mode === 'distance') {
                            setPieces(
                              replacePiece(draft.pieces, {
                                ...piece,
                                seconds,
                                paceSecPerKm: paceFromSeconds(piece.distanceM, seconds),
                              }),
                            )
                            return
                          }
                          setPieces(replacePiece(draft.pieces, { ...piece, seconds }))
                        }}
                      />
                    ) : null}
                  </article>
                  {showGap ? (
                    <TransitionSlot
                      seconds={piece.transitionAfterSec}
                      betweenRounds={isLast}
                      counts={isLast ? repeats : true}
                      onChange={(transitionAfterSec) => setTransition(piece.id, transitionAfterSec)}
                    />
                  ) : null}
                </li>
              )
            })}
          </ol>

          <div className="metcon__add">
            <button
              type="button"
              className="wods__ghost"
              onClick={() => addPiece(createCardio())}
            >
              Añadir cardio
            </button>
            <button
              type="button"
              className="wods__ghost"
              onClick={() => addPiece(createExercise())}
            >
              Añadir ejercicio
            </button>
          </div>

          <div className="metcon__add">
            <button
              type="button"
              className="wods__ghost"
              onClick={() => {
                setOpenIds(new Set())
                setDraft(emptyMetcon())
              }}
            >
              Empezar de cero
            </button>
          </div>
        </section>

        <aside className="metcon__result" aria-live="polite">
          {draft.format === 'amrap' ? (
            <>
              <p>En {formatClock(draft.capSec)}</p>
              <strong>{roundsLabel(result.fullRounds)}</strong>
              {result.partial.length > 0 ? (
                <em>{`${result.partial.join(' + ')} de la siguiente`}</em>
              ) : result.perRoundSec > 0 ? (
                <em>{`${formatClock(result.perRoundSec)} por ronda`}</em>
              ) : null}
            </>
          ) : (
            <>
              <p>Tiempo estimado</p>
              <strong>{formatClock(result.totalSec)}</strong>
              <em>
                {result.rounds === 1
                  ? `1 ronda · ${formatClock(result.perRoundSec)}`
                  : `${result.rounds} rondas · ${formatClock(result.perRoundSec)} por ronda`}
              </em>
            </>
          )}

          {result.steps.length === 0 ? (
            <p className="metcon__empty">Añade cardio o un ejercicio.</p>
          ) : (
            <>
              <h2>Una ronda</h2>
              <ol className="metcon__sequence">
                {result.steps.map((step) => {
                  const share =
                    result.perRoundSec === 0 ? 0 : (step.seconds / result.perRoundSec) * 100
                  return (
                    <li key={step.id} className={step.kind === 'transition' ? 'is-transition' : undefined}>
                      <div className="metcon__track" aria-hidden="true">
                        <span style={{ width: `${share}%` }} />
                      </div>
                      <div className="metcon__sequence-copy">
                        <span>{formatClock(step.startSec)}</span>
                        <strong>{step.label}</strong>
                        <em>
                          {formatClock(step.seconds)}
                          {step.pace ? ` · ${step.pace}` : ''}
                        </em>
                      </div>
                    </li>
                  )
                })}
              </ol>
              {draft.format === 'amrap' && result.betweenRoundSec > 0 ? (
                <p className="metcon__repeat">
                  {`Cada vuelta al inicio suma ${formatClock(result.betweenRoundSec)}.`}
                </p>
              ) : null}
              {draft.format === 'fortime' && result.rounds > 1 ? (
                <p className="metcon__repeat">
                  {`El mismo bloque se repite ${result.rounds} veces.${
                    result.betweenRoundSec > 0
                      ? ` Al cambiar de ronda se suman ${formatClock(result.betweenRoundSec)}${
                          result.betweenRounds > 1 ? ` (${result.betweenRounds} veces)` : ''
                        }.`
                      : ''
                  } En total, ${formatClock(result.totalSec)}.`}
                </p>
              ) : null}
            </>
          )}
        </aside>
      </div>
    </main>
  )
}

function TransitionSlot({
  seconds,
  betweenRounds,
  counts,
  onChange,
}: {
  seconds: number | null
  betweenRounds: boolean
  counts: boolean
  onChange: (seconds: number | null) => void
}) {
  if (seconds == null) {
    return (
      <div className="metcon__gap">
        <button type="button" className="wods__ghost" onClick={() => onChange(5)}>
          {betweenRounds ? 'Añadir transición entre rondas' : 'Añadir transición'}
        </button>
      </div>
    )
  }

  return (
    <div className="metcon__gap">
      <TimeAdjuster
        label={betweenRounds ? 'Entre rondas' : 'Transición'}
        seconds={seconds}
        onChange={onChange}
      />
      <button type="button" className="wods__ghost" onClick={() => onChange(null)}>
        Quitar
      </button>
      {betweenRounds && !counts ? (
        <p className="metcon__note">No cuenta mientras haya una sola ronda.</p>
      ) : null}
    </div>
  )
}

function TimeAdjuster({
  seconds,
  onChange,
  label = 'Tiempo de este bloque',
  suffix,
}: {
  seconds: number
  onChange: (seconds: number) => void
  label?: string
  suffix?: string
}) {
  const setSeconds = (next: number) => onChange(clampSeconds(next))

  return (
    <div className="metcon__time">
      {label ? <span>{label}</span> : null}
      <div className="metcon__time-row">
        <button type="button" aria-label="Bajar 5 segundos" onClick={() => setSeconds(seconds - 5)}>
          −5
        </button>
        <button type="button" aria-label="Bajar 1 segundo" onClick={() => setSeconds(seconds - 1)}>
          −1
        </button>
        <strong>
          {formatClock(seconds)}
          {suffix ? <small> {suffix}</small> : null}
        </strong>
        <button type="button" aria-label="Subir 1 segundo" onClick={() => setSeconds(seconds + 1)}>
          +1
        </button>
        <button type="button" aria-label="Subir 5 segundos" onClick={() => setSeconds(seconds + 5)}>
          +5
        </button>
      </div>
    </div>
  )
}

function CardioFields({
  piece,
  onChange,
}: {
  piece: CardioPiece
  onChange: (piece: CardioPiece) => void
}) {
  const setMode = (mode: CardioMode) => {
    if (mode === piece.mode) return
    if (mode === 'cal') {
      onChange({ ...piece, mode, calories: piece.calories || 15, seconds: piece.seconds || 45 })
      return
    }
    onChange({
      ...piece,
      mode,
      seconds: secondsFromPace(piece.distanceM, piece.paceSecPerKm),
    })
  }

  const setCalories = (calories: number) => {
    onChange({
      ...piece,
      calories,
      seconds: scaledSeconds(piece.seconds, piece.calories, calories),
    })
  }

  const setDistance = (distanceM: number) => {
    onChange({
      ...piece,
      distanceM,
      seconds: secondsFromPace(distanceM, piece.paceSecPerKm),
    })
  }

  const setPace = (paceSecPerKm: number) => {
    const pace = clampPace(paceSecPerKm)
    onChange({
      ...piece,
      paceSecPerKm: pace,
      seconds: secondsFromPace(piece.distanceM, pace),
    })
  }

  return (
    <div className="metcon__fields">
      <label>
        Cardio
        <select
          value={piece.cardio}
          onChange={(event) => onChange({ ...piece, cardio: event.target.value as CardioId })}
        >
          {CARDIO.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <div className="metcon__chips">
        <button
          type="button"
          className={piece.mode === 'cal' ? 'is-on' : undefined}
          onClick={() => setMode('cal')}
        >
          Calorías
        </button>
        <button
          type="button"
          className={piece.mode === 'distance' ? 'is-on' : undefined}
          onClick={() => setMode('distance')}
        >
          Distancia
        </button>
      </div>
      {piece.mode === 'cal' ? (
        <>
          <span>Calorías</span>
          <div className="metcon__chips">
            {CALORIE_PRESETS.map((calories) => (
              <button
                key={calories}
                type="button"
                className={calories === piece.calories ? 'is-on' : undefined}
                onClick={() => setCalories(calories)}
              >
                {calories} cal
              </button>
            ))}
          </div>
          <AmountField
            key={piece.calories}
            value={piece.calories}
            min={1}
            max={200}
            suffix="cal"
            onCommit={setCalories}
          />
        </>
      ) : (
        <>
          <span>Distancia</span>
          <div className="metcon__chips">
            {DISTANCE_PRESETS.map((distance) => (
              <button
                key={distance}
                type="button"
                className={distance === piece.distanceM ? 'is-on' : undefined}
                onClick={() => setDistance(distance)}
              >
                {distance} m
              </button>
            ))}
          </div>
          <AmountField
            key={piece.distanceM}
            value={piece.distanceM}
            min={50}
            max={20000}
            suffix="m"
            onCommit={setDistance}
          />
          <TimeAdjuster
            label="Ritmo"
            suffix="/km"
            seconds={piece.paceSecPerKm}
            onChange={setPace}
          />
        </>
      )}
    </div>
  )
}

function ExerciseFields({
  piece,
  onChange,
}: {
  piece: ExercisePiece
  onChange: (piece: ExercisePiece) => void
}) {
  const def = exerciseDef(piece.exerciseId)
  const fit = paceFit(def, piece.paceMode, piece.seconds, piece.reps)
  const perRep = piece.reps > 0 ? piece.seconds / piece.reps : 0

  const setReps = (reps: number) => {
    onChange({
      ...piece,
      reps,
      seconds: scaledSeconds(piece.seconds, piece.reps, reps),
    })
  }

  const setPaceMode = (paceMode: PaceMode) => {
    onChange({
      ...piece,
      paceMode,
      seconds: exerciseSeconds(piece.exerciseId, piece.reps, paceMode),
    })
  }

  const setExercise = (exerciseId: string) => {
    onChange({
      ...piece,
      exerciseId,
      seconds: exerciseSeconds(exerciseId, piece.reps, piece.paceMode),
    })
  }

  return (
    <div className="metcon__fields">
      <label>
        Ejercicio
        <select value={piece.exerciseId} onChange={(event) => setExercise(event.target.value)}>
          {EXERCISE_GROUPS.map((group) => (
            <optgroup key={group.id} label={group.label}>
              {EXERCISES.filter((item) => item.group === group.id).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="metcon__chips">
        <button
          type="button"
          className={piece.paceMode === 'pacing' ? 'is-on' : undefined}
          onClick={() => setPaceMode('pacing')}
        >
          Ritmo medio
        </button>
        <button
          type="button"
          className={piece.paceMode === 'sprint' ? 'is-on' : undefined}
          onClick={() => setPaceMode('sprint')}
        >
          Sprint
        </button>
      </div>
      <p className="metcon__note">
        Ritmo medio {formatRange(def.pacing)}. Sprint {formatRange(def.sprint)}.
      </p>
      {def.unitNote ? <p className="metcon__note">{def.unitNote}</p> : null}
      <span>Repeticiones</span>
      <div className="metcon__chips">
        {REP_PRESETS.map((reps) => (
          <button
            key={reps}
            type="button"
            className={reps === piece.reps ? 'is-on' : undefined}
            onClick={() => setReps(reps)}
          >
            {reps}
          </button>
        ))}
      </div>
      <AmountField
        key={piece.reps}
        value={piece.reps}
        min={1}
        max={500}
        suffix="reps"
        onCommit={setReps}
      />
      {fit ? (
        <p className={`metcon__fit is-${fit}`}>
          Ahora {formatRepSeconds(perRep)} s/rep. {fitLabel(fit, piece.paceMode)}
        </p>
      ) : null}
    </div>
  )
}

function roundsLabel(rounds: number): string {
  if (rounds === 1) return '1 ronda'
  return `${rounds} rondas`
}

function fitLabel(fit: 'inside' | 'faster' | 'slower', mode: PaceMode): string {
  const band = mode === 'sprint' ? 'sprint' : 'ritmo medio'
  if (fit === 'inside') return `Dentro del ${band}.`
  if (fit === 'faster') return `Más rápido que el ${band}.`
  return `Más lento que el ${band}.`
}

function AmountField({
  value,
  min,
  max,
  suffix,
  onCommit,
}: {
  value: number
  min: number
  max: number
  suffix: string
  onCommit: (value: number) => void
}) {
  const [text, setText] = useState(String(value))

  const commit = () => {
    const parsed = Number(text)
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      setText(String(value))
      return
    }
    onCommit(parsed)
  }

  return (
    <label className="metcon__amount">
      <input
        value={text}
        inputMode="numeric"
        aria-label={suffix}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur()
          }
        }}
      />
      <span>{suffix}</span>
    </label>
  )
}
