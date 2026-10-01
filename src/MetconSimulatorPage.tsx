import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { SortablePieceList, TimeAdjuster, createCardio, createExercise, reorderPieces } from './components/PieceCard'
import {
  clampCap,
  clampRounds,
  emptyMetcon,
  formatClock,
  simulate,
  type MetconDraft,
  type MetconFormat,
  type MetconPiece,
} from './metconSim'
import './MetconSimulatorPage.css'

const CAP_PRESETS = [8, 10, 12, 15, 20]

function replacePiece(pieces: MetconPiece[], nextPiece: MetconPiece): MetconPiece[] {
  return pieces.map((piece) => (piece.id === nextPiece.id ? nextPiece : piece))
}

export function MetconSimulatorPage() {
  const [draft, setDraft] = useState<MetconDraft>(emptyMetcon)
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())
  const result = simulate(draft.rounds, draft.pieces, {
    format: draft.format,
    capSec: draft.capSec,
  })

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

  return (
    <main className="wods metcon">
      <AppHeader
        actions={
          <Link to="/" className="wods__back">
            Inicio
          </Link>
        }
      />

      <section className="wods__hero">
        <h1>Simulador de WODs</h1>
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

          <SortablePieceList
            pieces={draft.pieces}
            openIds={openIds}
            onToggle={togglePiece}
            onChange={(next) => setPieces(replacePiece(draft.pieces, next))}
            onRemove={(id) => setPieces(draft.pieces.filter((item) => item.id !== id))}
            onReorder={(fromId, toId) => setPieces(reorderPieces(draft.pieces, fromId, toId))}
            renderAfter={(piece, index) => {
              const isLast = index === draft.pieces.length - 1
              const repeats = draft.format === 'amrap' || draft.rounds > 1
              const showGap = !isLast || repeats || piece.transitionAfterSec != null
              if (!showGap) return null
              return (
                <TransitionSlot
                  seconds={piece.transitionAfterSec}
                  betweenRounds={isLast}
                  counts={isLast ? repeats : true}
                  onChange={(transitionAfterSec) => setTransition(piece.id, transitionAfterSec)}
                />
              )
            }}
          />

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

function roundsLabel(rounds: number): string {
  if (rounds === 1) return '1 ronda'
  return `${rounds} rondas`
}
