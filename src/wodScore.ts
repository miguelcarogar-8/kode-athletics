export type WodType = 'for_time' | 'amrap' | 'emom'

export interface WodScoreSnapshot {
  elapsedSec: number | null
  rounds: number | null
  reps: number | null
}

export interface AnnotatedScore<T extends WodScoreSnapshot> {
  score: T
  value: number
  label: string
  deltaLabel: string | null
  improved: boolean | null
  isBest: boolean
}

export interface ScoreAnnotation<T extends WodScoreSnapshot> {
  items: AnnotatedScore<T>[]
  bestLabel: string | null
  sinceFirstLabel: string | null
}

export function repsPerRound(reps: string[]): number | null {
  if (reps.length === 0) return null
  let total = 0
  for (const value of reps) {
    if (!/^\d+$/.test(value.trim())) return null
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed <= 0) return null
    total += parsed
  }
  return total
}

export function compareValue(type: WodType, score: WodScoreSnapshot, perRound: number | null): number {
  if (type === 'for_time') return score.elapsedSec ?? Number.POSITIVE_INFINITY
  if (type === 'amrap') {
    const rounds = score.rounds ?? 0
    const extra = score.reps ?? 0
    if (perRound != null) return rounds * perRound + extra
    return rounds * 1_000_000 + extra
  }
  return score.reps ?? 0
}

export function formatScoreLabel(type: WodType, score: WodScoreSnapshot): string {
  if (type === 'for_time') return formatClock(score.elapsedSec ?? 0)
  if (type === 'amrap') {
    const rounds = score.rounds ?? 0
    const extra = score.reps ?? 0
    if (rounds === 0) return extra === 1 ? '1 rep' : `${extra} reps`
    const roundLabel = rounds === 1 ? '1 ronda' : `${rounds} rondas`
    if (extra === 0) return roundLabel
    return `${roundLabel} + ${extra}`
  }
  const reps = score.reps ?? 0
  return reps === 1 ? '1 rep' : `${reps} reps`
}

export function annotateScores<T extends WodScoreSnapshot>(
  type: WodType,
  scores: T[],
  exerciseReps: string[],
): ScoreAnnotation<T> {
  const perRound = type === 'amrap' ? repsPerRound(exerciseReps) : null
  if (scores.length === 0) {
    return { items: [], bestLabel: null, sinceFirstLabel: null }
  }

  const values = scores.map((score) => compareValue(type, score, perRound))
  const bestValue = type === 'for_time' ? Math.min(...values) : Math.max(...values)
  const items = scores.map((score, index) => {
    const previous = index > 0 ? scores[index - 1] : null
    const delta = previous ? describeDelta(type, score, previous, perRound, 'la anterior') : null
    return {
      score,
      value: values[index],
      label: formatScoreLabel(type, score),
      deltaLabel: delta?.text ?? null,
      improved: previous ? (delta?.improved ?? null) : null,
      isBest: values[index] === bestValue,
    }
  })

  const best = scores[values.findIndex((value) => value === bestValue)]
  let sinceFirstLabel: string | null = null
  if (scores.length > 1) {
    if (values.every((value) => value === bestValue)) {
      sinceFirstLabel = 'Misma marca en todos los intentos'
    } else if (values[0] === bestValue) {
      const tiedLater = values.slice(1).some((value) => value === bestValue)
      sinceFirstLabel = tiedLater
        ? 'Has igualado la primera marca'
        : 'La primera marca sigue siendo la mejor'
    } else {
      sinceFirstLabel = describeDelta(type, best, scores[0], perRound, 'la primera vez').text
    }
  }

  return {
    items,
    bestLabel: formatScoreLabel(type, best),
    sinceFirstLabel,
  }
}

function describeDelta(
  type: WodType,
  current: WodScoreSnapshot,
  previous: WodScoreSnapshot,
  perRound: number | null,
  against: string,
): { text: string; improved: boolean | null } {
  if (type === 'for_time') {
    const delta = (previous.elapsedSec ?? 0) - (current.elapsedSec ?? 0)
    if (delta === 0) return { text: `Mismo tiempo que ${against}`, improved: null }
    const amount = formatDuration(Math.abs(delta))
    if (delta > 0) return { text: `${amount} más rápido que ${against}`, improved: true }
    return { text: `${amount} más lento que ${against}`, improved: false }
  }

  if (type === 'emom') {
    return countDelta((current.reps ?? 0) - (previous.reps ?? 0), 'rep', 'reps', against)
  }

  if (perRound != null) {
    const currentTotal = (current.rounds ?? 0) * perRound + (current.reps ?? 0)
    const previousTotal = (previous.rounds ?? 0) * perRound + (previous.reps ?? 0)
    return countDelta(currentTotal - previousTotal, 'rep', 'reps', against, 'Mismo trabajo')
  }

  const roundDelta = (current.rounds ?? 0) - (previous.rounds ?? 0)
  const repDelta = (current.reps ?? 0) - (previous.reps ?? 0)
  if (roundDelta === 0 && repDelta === 0) {
    return { text: `Mismo trabajo que ${against}`, improved: null }
  }
  if (roundDelta === 0) return countDelta(repDelta, 'rep', 'reps', against)
  if (repDelta === 0) return countDelta(roundDelta, 'ronda', 'rondas', against)

  const roundPart = countPhrase(roundDelta, 'ronda', 'rondas')
  const repPart = countPhrase(repDelta, 'rep', 'reps')
  const improved = roundDelta > 0 && repDelta > 0 ? true : roundDelta < 0 && repDelta < 0 ? false : null
  return { text: `${roundPart} y ${repPart} que ${against}`, improved }
}

function countDelta(
  delta: number,
  singular: string,
  plural: string,
  against: string,
  tie = 'Mismas repeticiones',
): { text: string; improved: boolean | null } {
  if (delta === 0) return { text: `${tie} que ${against}`, improved: null }
  const phrase = countPhrase(delta, singular, plural)
  return { text: `${phrase} que ${against}`, improved: delta > 0 }
}

function countPhrase(delta: number, singular: string, plural: string): string {
  const amount = Math.abs(delta)
  const unit = amount === 1 ? singular : plural
  return `${amount} ${unit} ${delta > 0 ? 'más' : 'menos'}`
}

function formatClock(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatDuration(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds))
  if (total < 60) return `${total} s`
  return formatClock(total)
}
