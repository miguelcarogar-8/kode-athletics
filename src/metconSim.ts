export const CARDIO = [
  { id: 'run', label: 'Correr' },
  { id: 'bikerg', label: 'BikeErg' },
  { id: 'skierg', label: 'SkiErg' },
  { id: 'rowerg', label: 'RowErg' },
  { id: 'assault', label: 'Assault bike' },
] as const

export type CardioId = (typeof CARDIO)[number]['id']
export type CardioMode = 'cal' | 'distance'

export const EXERCISE_GROUPS = [
  { id: 'barra', label: 'Barra y mancuernas' },
  { id: 'gimnasticos', label: 'Gimnásticos' },
  { id: 'otros', label: 'Otros' },
] as const

export type ExerciseGroup = (typeof EXERCISE_GROUPS)[number]['id']
export type PaceMode = 'pacing' | 'sprint'
export type WorkUnit = 'reps' | 'meters'

export interface RepRange {
  min: number
  max: number
}

export interface ExerciseDef {
  id: string
  name: string
  group: ExerciseGroup
  pacing: RepRange
  sprint: RepRange
  meterPacing?: RepRange
  meterSprint?: RepRange
  units?: WorkUnit[]
  unitNote?: string
}

export const EXERCISES: ExerciseDef[] = [
  { id: 'deadlift', name: 'Peso muerto', group: 'barra', pacing: { min: 1.8, max: 2.5 }, sprint: { min: 1.2, max: 1.5 } },
  { id: 'squat', name: 'Front squat / Back squat', group: 'barra', pacing: { min: 2, max: 2.5 }, sprint: { min: 1.5, max: 1.5 } },
  { id: 'thruster', name: 'Thruster', group: 'barra', pacing: { min: 2.5, max: 3 }, sprint: { min: 2, max: 2 } },
  { id: 'clean', name: 'Power clean / Hang clean', group: 'barra', pacing: { min: 2, max: 2.8 }, sprint: { min: 1.5, max: 1.8 } },
  { id: 'snatch', name: 'Snatch', group: 'barra', pacing: { min: 2.5, max: 3.5 }, sprint: { min: 1.8, max: 2.2 } },
  { id: 'jerk', name: 'Push press / Push jerk', group: 'barra', pacing: { min: 1.5, max: 2 }, sprint: { min: 1, max: 1.2 } },
  { id: 'devil-press', name: 'Dumbbell devil press', group: 'barra', pacing: { min: 4.5, max: 6 }, sprint: { min: 3.5, max: 4 } },
  { id: 'db-snatch', name: 'Dumbbell snatch (alterno)', group: 'barra', pacing: { min: 2.5, max: 3 }, sprint: { min: 1.8, max: 2.2 } },
  { id: 'pullup-kipping', name: 'Pull-ups kipping', group: 'gimnasticos', pacing: { min: 1.2, max: 1.5 }, sprint: { min: 0.8, max: 1 } },
  { id: 'pullup-butterfly', name: 'Pull-ups butterfly', group: 'gimnasticos', pacing: { min: 0.8, max: 1 }, sprint: { min: 0.6, max: 0.7 } },
  { id: 'toes-to-bar', name: 'Toes to bar', group: 'gimnasticos', pacing: { min: 1.5, max: 1.8 }, sprint: { min: 1.1, max: 1.3 } },
  { id: 'chest-to-bar', name: 'Chest to bar', group: 'gimnasticos', pacing: { min: 1.5, max: 2 }, sprint: { min: 1.1, max: 1.3 } },
  { id: 'muscle-up', name: 'Bar / Ring muscle-up', group: 'gimnasticos', pacing: { min: 3, max: 4 }, sprint: { min: 2.2, max: 2.5 } },
  { id: 'hspu', name: 'HSPU kipping', group: 'gimnasticos', pacing: { min: 1.8, max: 2.3 }, sprint: { min: 1.2, max: 1.5 } },
  { id: 'pushup', name: 'Push-ups', group: 'gimnasticos', pacing: { min: 1.2, max: 1.5 }, sprint: { min: 0.8, max: 1 } },
  { id: 'air-squat', name: 'Air squats', group: 'gimnasticos', pacing: { min: 1, max: 1.3 }, sprint: { min: 0.7, max: 0.8 } },
  { id: 'sit-up', name: 'Sit-ups', group: 'gimnasticos', pacing: { min: 1.4, max: 1.8 }, sprint: { min: 1, max: 1.2 }, unitNote: 'El peso es el del disco o la mancuerna, si se hace lastrado.' },
  { id: 'burpee', name: 'Burpees', group: 'otros', pacing: { min: 3, max: 4 }, sprint: { min: 2, max: 2.5 } },
  { id: 'burpee-bar', name: 'Burpees over the bar', group: 'otros', pacing: { min: 3.5, max: 4.5 }, sprint: { min: 2.5, max: 3 } },
  { id: 'burpee-plate', name: 'Burpees plate', group: 'otros', pacing: { min: 3.2, max: 4.2 }, sprint: { min: 2.2, max: 2.7 }, unitNote: 'Cada repetición es un burpee con el disco. El peso es el del disco.' },
  { id: 'wall-ball', name: 'Wall balls', group: 'otros', pacing: { min: 2.2, max: 2.6 }, sprint: { min: 1.8, max: 2 } },
  { id: 'slam-ball', name: 'Slam ball', group: 'otros', pacing: { min: 1.8, max: 2.4 }, sprint: { min: 1.2, max: 1.6 }, unitNote: 'El peso es el de la bola.' },
  { id: 'lunge', name: 'Zancadas', group: 'otros', pacing: { min: 1.5, max: 1.8 }, sprint: { min: 1, max: 1.2 }, meterPacing: { min: 1.5, max: 1.8 }, meterSprint: { min: 1, max: 1.2 }, units: ['reps', 'meters'], unitNote: 'En repeticiones, cada una es una pierna. En metros, el tiempo es por metro.' },
  { id: 'farmer-carry', name: 'Farmer carry', group: 'otros', pacing: { min: 1.2, max: 1.8 }, sprint: { min: 0.7, max: 1 }, meterPacing: { min: 1.2, max: 1.8 }, meterSprint: { min: 0.7, max: 1 }, units: ['meters'], unitNote: 'El tiempo es por metro. El peso es por mano.' },
  { id: 'box-jump', name: 'Box jumps', group: 'otros', pacing: { min: 2.5, max: 3.5 }, sprint: { min: 1.8, max: 2 }, unitNote: 'El sprint cuenta el rebote.' },
  { id: 'box-step', name: 'Box step', group: 'otros', pacing: { min: 2, max: 2.6 }, sprint: { min: 1.4, max: 1.7 }, unitNote: 'Cada repetición es una subida y bajada. El peso es el total de las mancuernas.' },
  { id: 'box-step-over', name: 'Box step over', group: 'otros', pacing: { min: 2.6, max: 3.4 }, sprint: { min: 1.8, max: 2.2 }, unitNote: 'Cada repetición es pasar el cajón. El peso es el total de las mancuernas.' },
  { id: 'kettlebell', name: 'Kettlebell swings', group: 'otros', pacing: { min: 2, max: 2.5 }, sprint: { min: 1.6, max: 1.8 } },
  { id: 'double-under', name: 'Double unders', group: 'otros', pacing: { min: 0.6, max: 0.7 }, sprint: { min: 0.4, max: 0.5 } },
  { id: 'rope', name: 'Subida a la cuerda (4,5 m)', group: 'otros', pacing: { min: 10, max: 15 }, sprint: { min: 6, max: 8 }, unitNote: 'Cada repetición es una subida.' },
]

export type PaceFit = 'inside' | 'faster' | 'slower'

export interface CardioPiece {
  id: string
  kind: 'cardio'
  cardio: CardioId
  mode: CardioMode
  calories: number
  distanceM: number
  paceSecPerKm: number
  seconds: number
  transitionAfterSec: number | null
}

export interface ExercisePiece {
  id: string
  kind: 'exercise'
  exerciseId: string
  reps: number
  unit: WorkUnit
  weightKg: number | null
  paceMode: PaceMode
  seconds: number
  transitionAfterSec: number | null
}

export type MetconPiece = CardioPiece | ExercisePiece
export type MetconFormat = 'fortime' | 'amrap'

export interface MetconDraft {
  format: MetconFormat
  rounds: number
  capSec: number
  pieces: MetconPiece[]
}

export interface SimulationStep {
  id: string
  kind: 'work' | 'transition'
  label: string
  pace: string | null
  seconds: number
  startSec: number
}

export interface Simulation {
  rounds: number
  perRoundSec: number
  totalSec: number
  betweenRoundSec: number
  betweenRounds: number
  steps: SimulationStep[]
  format: MetconFormat
  capSec: number
  fullRounds: number
  partial: string[]
}

const MAX_ROUNDS = 30
const MAX_SECONDS = 60 * 60
const MIN_CAP_SEC = 60
const MAX_CAP_SEC = 60 * 60
const MIN_PACE_SEC_PER_KM = 60
const MAX_PACE_SEC_PER_KM = 20 * 60

export function cardioLabel(id: CardioId): string {
  return CARDIO.find((item) => item.id === id)?.label ?? CARDIO[0].label
}

export function exerciseDef(id: string): ExerciseDef {
  return EXERCISES.find((item) => item.id === id) ?? EXERCISES[0]
}

export function rangeMid(range: RepRange): number {
  return (range.min + range.max) / 2
}

export function exerciseUnits(def: ExerciseDef): WorkUnit[] {
  return def.units ?? ['reps']
}

export function workRange(def: ExerciseDef, mode: PaceMode, unit: WorkUnit): RepRange {
  if (unit === 'meters') {
    const meters = mode === 'sprint' ? def.meterSprint : def.meterPacing
    if (meters) return meters
  }
  return mode === 'sprint' ? def.sprint : def.pacing
}

export function secondsForReps(def: ExerciseDef, mode: PaceMode, reps: number, unit: WorkUnit = 'reps'): number {
  return clampSeconds(rangeMid(workRange(def, mode, unit)) * Math.max(0, reps))
}

export function formatRepSeconds(value: number): string {
  return value.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function formatRange(range: RepRange, unit: WorkUnit = 'reps'): string {
  const suffix = unit === 'meters' ? 's/m' : 's/rep'
  if (range.min === range.max) return `${formatRepSeconds(range.min)} ${suffix}`
  return `${formatRepSeconds(range.min)}–${formatRepSeconds(range.max)} ${suffix}`
}

export function paceFit(
  def: ExerciseDef,
  mode: PaceMode,
  seconds: number,
  reps: number,
  unit: WorkUnit = 'reps',
): PaceFit | null {
  if (reps <= 0 || seconds < 0) return null
  const perRep = seconds / reps
  const range = workRange(def, mode, unit)
  if (perRep < range.min - 0.05) return 'faster'
  if (perRep > range.max + 0.05) return 'slower'
  return 'inside'
}

export function formatMinSec(totalSec: number): string {
  const rounded = Math.max(0, Math.round(totalSec))
  const minutes = Math.floor(rounded / 60)
  const seconds = rounded % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatClock(totalSec: number): string {
  const rounded = Math.max(0, Math.round(totalSec))
  const hours = Math.floor(rounded / 3600)
  if (hours === 0) return formatMinSec(rounded)
  const minutes = Math.floor((rounded % 3600) / 60)
  const seconds = rounded % 60
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function scaledSeconds(seconds: number, previousAmount: number, nextAmount: number): number {
  if (previousAmount <= 0 || nextAmount <= 0) return clampSeconds(seconds)
  return clampSeconds(Math.round((seconds * nextAmount) / previousAmount))
}

export function clampSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0
  return Math.min(MAX_SECONDS, Math.max(0, Math.round(seconds)))
}

export function clampPace(paceSecPerKm: number): number {
  if (!Number.isFinite(paceSecPerKm)) return 5 * 60
  return Math.min(MAX_PACE_SEC_PER_KM, Math.max(MIN_PACE_SEC_PER_KM, Math.round(paceSecPerKm)))
}

export function secondsFromPace(distanceM: number, paceSecPerKm: number): number {
  if (distanceM <= 0 || paceSecPerKm <= 0) return 0
  return clampSeconds((distanceM / 1000) * paceSecPerKm)
}

export function paceFromSeconds(distanceM: number, seconds: number): number {
  if (distanceM <= 0) return clampPace(5 * 60)
  return clampPace((seconds * 1000) / distanceM)
}

export function clampRounds(rounds: number): number {
  if (!Number.isInteger(rounds)) return 1
  return Math.min(MAX_ROUNDS, Math.max(1, rounds))
}

export function clampCap(seconds: number): number {
  if (!Number.isFinite(seconds)) return 12 * 60
  return Math.min(MAX_CAP_SEC, Math.max(MIN_CAP_SEC, Math.round(seconds)))
}

export function emptyMetcon(): MetconDraft {
  return {
    format: 'fortime',
    rounds: 1,
    capSec: 12 * 60,
    pieces: [],
  }
}

const MIN_WEIGHT_KG = 1
const MAX_WEIGHT_KG = 300

export function normalizeWeightKg(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null
  const rounded = Math.round(value * 10) / 10
  if (rounded < MIN_WEIGHT_KG || rounded > MAX_WEIGHT_KG) return null
  return rounded
}

export function parseWeightKg(text: string): number | null {
  const normalized = text.trim().replace(',', '.')
  if (!/^\d{1,3}(\.\d)?$/.test(normalized)) return null
  return normalizeWeightKg(Number(normalized))
}

export function formatKg(kg: number): string {
  const rounded = Math.round(kg * 10) / 10
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return `${text} kg`
}

export function pieceLabel(piece: MetconPiece): string {
  if (piece.kind === 'cardio') {
    if (piece.mode === 'cal') return `${piece.calories} cal ${cardioLabel(piece.cardio)}`
    return `${piece.distanceM} m ${cardioLabel(piece.cardio)}`
  }
  const def = exerciseDef(piece.exerciseId)
  const name = piece.unit === 'meters' ? `${piece.reps} m ${def.name}` : `${piece.reps} ${def.name}`
  return piece.weightKg == null ? name : `${name} · ${formatKg(piece.weightKg)}`
}

export function piecePace(piece: MetconPiece): string | null {
  if (piece.seconds <= 0) return null
  if (piece.kind === 'cardio') {
    if (piece.mode === 'distance') {
      if (piece.paceSecPerKm <= 0) return null
      return `${formatMinSec(piece.paceSecPerKm)} /km`
    }
    if (piece.calories <= 0) return null
    const perCal = piece.seconds / piece.calories
    return `${perCal.toLocaleString('es-ES', { maximumFractionDigits: 1 })} s/cal`
  }
  if (piece.reps <= 0) return null
  const perRep = piece.seconds / piece.reps
  const suffix = piece.unit === 'meters' ? 's/m' : 's/rep'
  return `${perRep.toLocaleString('es-ES', { maximumFractionDigits: 1 })} ${suffix}`
}

export function simulate(
  rounds: number,
  pieces: MetconPiece[],
  options?: { format?: MetconFormat; capSec?: number },
): Simulation {
  const format = options?.format ?? 'fortime'
  const capSec = clampCap(options?.capSec ?? 12 * 60)
  const safeRounds = clampRounds(rounds)
  const steps: SimulationStep[] = []
  let cursor = 0

  pieces.forEach((piece, index) => {
    const seconds = clampSeconds(piece.seconds)
    steps.push({
      id: piece.id,
      kind: 'work',
      label: pieceLabel(piece),
      pace: piecePace({ ...piece, seconds }),
      seconds,
      startSec: cursor,
    })
    cursor += seconds
    const gap = gapSeconds(piece)
    if (gap > 0 && index < pieces.length - 1) {
      steps.push({
        id: `transition-${piece.id}`,
        kind: 'transition',
        label: 'Transición',
        pace: null,
        seconds: gap,
        startSec: cursor,
      })
      cursor += gap
    }
  })

  const lastGap = pieces.length > 0 ? gapSeconds(pieces[pieces.length - 1]) : 0
  const betweenRounds = safeRounds > 1 && lastGap > 0 ? safeRounds - 1 : 0
  const forTime: Simulation = {
    rounds: safeRounds,
    perRoundSec: cursor,
    totalSec: cursor * safeRounds + betweenRounds * lastGap,
    betweenRoundSec: betweenRounds > 0 ? lastGap : 0,
    betweenRounds,
    steps,
    format: 'fortime',
    capSec,
    fullRounds: safeRounds,
    partial: [],
  }
  if (format !== 'amrap') return forTime

  const amrap = roundsInCap(pieces, capSec, cursor, lastGap)
  return {
    ...forTime,
    format: 'amrap',
    rounds: amrap.fullRounds,
    totalSec: capSec,
    betweenRoundSec: lastGap,
    betweenRounds: amrap.fullRounds > 0 && lastGap > 0 ? amrap.fullRounds - (amrap.resting ? 1 : 0) : 0,
    fullRounds: amrap.fullRounds,
    partial: amrap.partial,
  }
}

function roundsInCap(
  pieces: MetconPiece[],
  capSec: number,
  finishSec: number,
  lastGap: number,
): { fullRounds: number; partial: string[]; resting: boolean } {
  if (finishSec <= 0) return { fullRounds: 0, partial: [], resting: false }
  let fullRounds = 0
  let cursor = 0
  let resting = false
  while (cursor + finishSec <= capSec) {
    fullRounds += 1
    cursor += finishSec
    if (lastGap > 0 && cursor + lastGap > capSec) {
      resting = true
      break
    }
    cursor += lastGap
  }
  return {
    fullRounds,
    resting,
    partial: resting ? [] : workDone(pieces, capSec - cursor),
  }
}

function workDone(pieces: MetconPiece[], remainder: number): string[] {
  const labels: string[] = []
  let left = remainder
  for (let index = 0; index < pieces.length && left > 0; index += 1) {
    const piece = pieces[index]
    const seconds = clampSeconds(piece.seconds)
    const gap = index < pieces.length - 1 ? gapSeconds(piece) : 0
    if (seconds <= 0) {
      left -= gap
      continue
    }
    if (left >= seconds) {
      labels.push(pieceLabel({ ...piece, seconds }))
      left -= seconds + gap
      continue
    }
    const partial = partialPieceLabel(piece, left)
    if (partial) labels.push(partial)
    break
  }
  return labels
}

function partialPieceLabel(piece: MetconPiece, usedSec: number): string | null {
  const seconds = clampSeconds(piece.seconds)
  if (usedSec <= 0 || seconds <= 0 || usedSec >= seconds) return null
  if (piece.kind === 'exercise') {
    const reps = Math.floor((piece.reps * usedSec) / seconds)
    if (reps <= 0) return null
    const def = exerciseDef(piece.exerciseId)
    const name = piece.unit === 'meters' ? `${reps} m ${def.name}` : `${reps} ${def.name}`
    return piece.weightKg == null ? name : `${name} · ${formatKg(piece.weightKg)}`
  }
  if (piece.mode === 'distance') {
    const meters = Math.floor((piece.distanceM * usedSec) / seconds)
    if (meters <= 0) return null
    return `${meters} m ${cardioLabel(piece.cardio)}`
  }
  const calories = Math.floor((piece.calories * usedSec) / seconds)
  if (calories <= 0) return null
  return `${calories} cal ${cardioLabel(piece.cardio)}`
}

function gapSeconds(piece: MetconPiece | undefined): number {
  if (!piece || piece.transitionAfterSec == null) return 0
  return clampSeconds(piece.transitionAfterSec)
}

export function exerciseSeconds(exerciseId: string, reps: number, paceMode: PaceMode, unit: WorkUnit = 'reps'): number {
  return secondsForReps(exerciseDef(exerciseId), paceMode, reps, unit)
}

export function exampleMetcon(): MetconDraft {
  return {
    format: 'fortime',
    rounds: 3,
    capSec: 12 * 60,
    pieces: [
      {
        id: 'example-run',
        kind: 'cardio',
        cardio: 'run',
        mode: 'distance',
        calories: 15,
        distanceM: 400,
        paceSecPerKm: 250,
        seconds: 100,
        transitionAfterSec: null,
      },
      {
        id: 'example-thruster',
        kind: 'exercise',
        exerciseId: 'thruster',
        reps: 21,
        unit: 'reps',
        weightKg: null,
        paceMode: 'pacing',
        seconds: exerciseSeconds('thruster', 21, 'pacing'),
        transitionAfterSec: null,
      },
      {
        id: 'example-pullup',
        kind: 'exercise',
        exerciseId: 'pullup-kipping',
        reps: 12,
        unit: 'reps',
        weightKg: null,
        paceMode: 'pacing',
        seconds: exerciseSeconds('pullup-kipping', 12, 'pacing'),
        transitionAfterSec: null,
      },
    ],
  }
}
