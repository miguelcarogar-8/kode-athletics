import { useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import {
  CARDIO,
  EXERCISE_GROUPS,
  EXERCISES,
  clampPace,
  clampSeconds,
  exerciseDef,
  exerciseSeconds,
  formatClock,
  formatKg,
  formatRange,
  formatRepSeconds,
  paceFit,
  parseWeightKg,
  paceFromSeconds,
  pieceLabel,
  piecePace,
  scaledSeconds,
  secondsFromPace,
  type CardioId,
  type CardioMode,
  type CardioPiece,
  type ExercisePiece,
  type MetconPiece,
  type PaceMode,
} from '../metconSim'
import '../MetconSimulatorPage.css'

const REP_PRESETS = [5, 10, 15, 21, 30]
const WEIGHT_PRESETS = [20, 24, 40, 60]
const CALORIE_PRESETS = [10, 15, 20, 30]
const DISTANCE_PRESETS = [200, 400, 800, 1000]

function newId(): string {
  return crypto.randomUUID()
}

export function createCardio(): CardioPiece {
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

export function createExercise(): ExercisePiece {
  const reps = 10
  const paceMode: PaceMode = 'pacing'
  return {
    id: newId(),
    kind: 'exercise',
    exerciseId: 'thruster',
    reps,
    weightKg: null,
    paceMode,
    seconds: exerciseSeconds('thruster', reps, paceMode),
    transitionAfterSec: null,
  }
}

export function reorderPieces(pieces: MetconPiece[], fromId: string, toId: string): MetconPiece[] {
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

export function SortablePieceList({
  pieces,
  openIds,
  onToggle,
  onChange,
  onRemove,
  onReorder,
  renderAfter,
  timing = true,
}: {
  pieces: MetconPiece[]
  openIds: ReadonlySet<string>
  onToggle: (id: string) => void
  onChange: (piece: MetconPiece) => void
  onRemove: (id: string) => void
  onReorder: (fromId: string, toId: string) => void
  renderAfter?: (piece: MetconPiece, index: number) => ReactNode
  timing?: boolean
}) {
  const drag = useRef<{ from: string; over: string | null } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const moveBy = (id: string, direction: -1 | 1) => {
    const index = pieces.findIndex((piece) => piece.id === id)
    const target = pieces[index + direction]
    if (!target) return
    onReorder(id, target.id)
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
    onReorder(current.from, current.over)
  }

  return (
    <ol className="metcon__pieces">
      {pieces.map((piece, index) => {
        const open = openIds.has(piece.id)
        return (
          <li
            key={piece.id}
            data-piece-id={piece.id}
            className={draggingId === piece.id ? 'is-dragging' : overId === piece.id ? 'is-over' : undefined}
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
              onReorder(from, piece.id)
            }}
          >
            <PieceCard
              piece={piece}
              open={open}
              onToggle={() => onToggle(piece.id)}
              onChange={onChange}
              onRemove={() => onRemove(piece.id)}
              onMove={(direction) => moveBy(piece.id, direction)}
              onHandleDragStart={(event) => {
                event.dataTransfer.setData('text/plain', piece.id)
                event.dataTransfer.effectAllowed = 'move'
                drag.current = { from: piece.id, over: null }
                setDraggingId(piece.id)
              }}
              onHandleDragEnd={() => {
                drag.current = null
                setDraggingId(null)
                setOverId(null)
              }}
              onHandlePointerDown={(event) => {
                if (event.pointerType === 'touch') onDragPointerDown(event, piece.id)
              }}
              onHandlePointerMove={onDragPointerMove}
              onHandlePointerUp={finishDrag}
              onHandlePointerCancel={finishDrag}
              timing={timing}
            />
            {renderAfter ? renderAfter(piece, index) : null}
          </li>
        )
      })}
    </ol>
  )
}

function PieceCard({
  piece,
  open,
  onToggle,
  onChange,
  onRemove,
  onMove,
  onHandleDragStart,
  onHandleDragEnd,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
  onHandlePointerCancel,
  timing,
}: {
  piece: MetconPiece
  open: boolean
  onToggle: () => void
  onChange: (piece: MetconPiece) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
  onHandleDragStart: (event: DragEvent<HTMLSpanElement>) => void
  onHandleDragEnd: () => void
  onHandlePointerDown: (event: ReactPointerEvent<HTMLSpanElement>) => void
  onHandlePointerMove: (event: ReactPointerEvent<HTMLSpanElement>) => void
  onHandlePointerUp: () => void
  onHandlePointerCancel: () => void
  timing: boolean
}) {
  const pace = piecePace(piece)

  const setSeconds = (seconds: number) => {
    if (piece.kind === 'cardio' && piece.mode === 'distance') {
      onChange({
        ...piece,
        seconds,
        paceSecPerKm: paceFromSeconds(piece.distanceM, seconds),
      })
      return
    }
    onChange({ ...piece, seconds })
  }

  return (
    <article className={open ? 'metcon__piece' : 'metcon__piece is-collapsed'}>
      <header className="metcon__piece-head">
        <span
          className="metcon__handle"
          role="button"
          tabIndex={0}
          draggable
          aria-label="Arrastrar para reordenar"
          onDragStart={onHandleDragStart}
          onDragEnd={onHandleDragEnd}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerCancel}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              onMove(-1)
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              onMove(1)
            }
          }}
        >
          ⋮⋮
        </span>
        {open ? (
          <span>{piece.kind === 'cardio' ? 'Cardio' : 'Ejercicio'}</span>
        ) : (
          <button type="button" className="metcon__summary" aria-expanded={false} onClick={onToggle}>
            <strong>{pieceLabel(piece)}</strong>
            {timing ? (
              <em>
                {formatClock(piece.seconds)}
                {pace ? ` · ${pace}` : ''}
              </em>
            ) : null}
          </button>
        )}
        <div className="metcon__piece-actions">
          <button type="button" aria-expanded={open} aria-label={open ? 'Plegar' : 'Desplegar'} onClick={onToggle}>
            {open ? '▴' : '▾'}
          </button>
          <button type="button" onClick={onRemove}>
            Quitar
          </button>
        </div>
      </header>

      {open && piece.kind === 'cardio' ? <CardioFields piece={piece} onChange={onChange} timing={timing} /> : null}
      {open && piece.kind === 'exercise' ? <ExerciseFields piece={piece} onChange={onChange} timing={timing} /> : null}
      {open && timing ? <TimeAdjuster seconds={piece.seconds} onChange={setSeconds} /> : null}
    </article>
  )
}

export function TimeAdjuster({
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
  timing,
}: {
  piece: CardioPiece
  onChange: (piece: CardioPiece) => void
  timing: boolean
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
        <button type="button" className={piece.mode === 'cal' ? 'is-on' : undefined} onClick={() => setMode('cal')}>
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
          <AmountField key={piece.calories} value={piece.calories} min={1} max={200} suffix="cal" onCommit={setCalories} />
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
          {timing ? <TimeAdjuster label="Ritmo" suffix="/km" seconds={piece.paceSecPerKm} onChange={setPace} /> : null}
        </>
      )}
    </div>
  )
}

function ExerciseFields({
  piece,
  onChange,
  timing,
}: {
  piece: ExercisePiece
  onChange: (piece: ExercisePiece) => void
  timing: boolean
}) {
  const def = exerciseDef(piece.exerciseId)
  const fit = timing ? paceFit(def, piece.paceMode, piece.seconds, piece.reps) : null
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
      {timing ? (
        <>
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
        </>
      ) : null}
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
      <AmountField key={piece.reps} value={piece.reps} min={1} max={500} suffix="reps" onCommit={setReps} />
      <span>Peso</span>
      <div className="metcon__chips">
        <button
          type="button"
          className={piece.weightKg == null ? 'is-on' : undefined}
          onClick={() => onChange({ ...piece, weightKg: null })}
        >
          Sin peso
        </button>
        {WEIGHT_PRESETS.map((kg) => (
          <button
            key={kg}
            type="button"
            className={kg === piece.weightKg ? 'is-on' : undefined}
            onClick={() => onChange({ ...piece, weightKg: kg })}
          >
            {kg} kg
          </button>
        ))}
      </div>
      <WeightField key={piece.weightKg ?? 'empty'} value={piece.weightKg} onCommit={(weightKg) => onChange({ ...piece, weightKg })} />
      <p className="metcon__note">En kilogramos. Déjalo vacío si el ejercicio no lleva peso.</p>
      {timing && fit ? (
        <p className={`metcon__fit is-${fit}`}>
          Ahora {formatRepSeconds(perRep)} s/rep. {fitLabel(fit, piece.paceMode)}
        </p>
      ) : null}
    </div>
  )
}

function fitLabel(fit: 'inside' | 'faster' | 'slower', mode: PaceMode): string {
  const band = mode === 'sprint' ? 'sprint' : 'ritmo medio'
  if (fit === 'inside') return `Dentro del ${band}.`
  if (fit === 'faster') return `Más rápido que el ${band}.`
  return `Más lento que el ${band}.`
}

function WeightField({
  value,
  onCommit,
}: {
  value: number | null
  onCommit: (value: number | null) => void
}) {
  const [text, setText] = useState(value == null ? '' : formatKg(value).replace(' kg', ''))

  const commit = () => {
    if (text.trim() === '') {
      onCommit(null)
      setText('')
      return
    }
    const parsed = parseWeightKg(text)
    if (parsed == null) {
      setText(value == null ? '' : formatKg(value).replace(' kg', ''))
      return
    }
    onCommit(parsed)
  }

  return (
    <label className="metcon__amount">
      <input
        value={text}
        inputMode="decimal"
        aria-label="Peso en kilogramos"
        placeholder="—"
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
      />
      <span>kg</span>
    </label>
  )
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
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
      />
      <span>{suffix}</span>
    </label>
  )
}
