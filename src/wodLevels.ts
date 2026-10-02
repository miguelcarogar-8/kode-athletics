import { CARDIO, EXERCISES, exerciseUnits, workRange, type CardioId, type ExerciseDef } from './metconSim.ts'
import { compareValue, formatScoreLabel, repsPerRound, type WodScoreSnapshot, type WodType } from './wodScore.ts'

export type LevelId = 'scaled' | 'intermediate' | 'rx'
export type LevelSource = 'catalog' | 'gemini'
export type LevelConfidence = 'low' | 'medium' | 'high'

export const LEVELS: { id: LevelId; label: string }[] = [
  { id: 'scaled', label: 'Escalado' },
  { id: 'intermediate', label: 'Intermedio' },
  { id: 'rx', label: 'RX' },
]

export interface LevelMark {
  elapsedSec: number | null
  rounds: number | null
  reps: number | null
}

export interface LevelTargets {
  source: LevelSource
  confidence: LevelConfidence
  note: string | null
  scaled: LevelMark
  intermediate: LevelMark
  rx: LevelMark
}

export interface LevelExerciseInput {
  name: string
  reps: string
  round?: number
  weightKg?: number | null
}

export interface LevelWodInput {
  type: WodType
  rounds: number
  timeCapSec: number | null
  exercises: LevelExerciseInput[]
}

export interface LevelReading {
  level: LevelId | 'below_scaled'
  summary: string
}

const LEVEL_NAME: Record<LevelId, string> = {
  scaled: 'escalado',
  intermediate: 'intermedio',
  rx: 'RX',
}

const TRANSITION: Record<LevelId, number> = { scaled: 8, intermediate: 4, rx: 2 }
const BETWEEN: Record<LevelId, number> = { scaled: 15, intermediate: 8, rx: 4 }
const FATIGUE: Record<LevelId, number> = { scaled: 1.12, intermediate: 1.06, rx: 1.03 }
const GENERIC_SEC: Record<LevelId, number> = { scaled: 4, intermediate: 3, rx: 2.2 }

const REFERENCE_KG: Record<string, number> = {
  deadlift: 100,
  squat: 60,
  thruster: 43,
  clean: 60,
  snatch: 43,
  jerk: 43,
  'devil-press': 22.5,
  'db-snatch': 22.5,
  'wall-ball': 9,
  kettlebell: 24,
  'farmer-carry': 24,
}

const DISTANCE_PACE: Record<CardioId, Record<LevelId, number>> = {
  run: { scaled: 390, intermediate: 300, rx: 240 },
  rowerg: { scaled: 300, intermediate: 252, rx: 216 },
  skierg: { scaled: 312, intermediate: 264, rx: 228 },
  bikerg: { scaled: 180, intermediate: 140, rx: 110 },
  assault: { scaled: 210, intermediate: 165, rx: 135 },
}

const CAL_PACE: Record<CardioId, Record<LevelId, number>> = {
  run: { scaled: 5, intermediate: 3.6, rx: 2.8 },
  rowerg: { scaled: 3.8, intermediate: 2.8, rx: 2.1 },
  skierg: { scaled: 4, intermediate: 3, rx: 2.3 },
  bikerg: { scaled: 3.4, intermediate: 2.5, rx: 1.8 },
  assault: { scaled: 4.2, intermediate: 3, rx: 2.2 },
}

const REP_SEC: Record<LevelId, (def: ExerciseDef) => number> = {
  scaled: (def) => def.pacing.max,
  intermediate: (def) => (def.pacing.min + def.pacing.max) / 2,
  rx: (def) => (def.sprint.min + def.sprint.max) / 2,
}

const METER_SEC: Record<LevelId, (def: ExerciseDef) => number> = {
  scaled: (def) => workRange(def, 'pacing', 'meters').max,
  intermediate: (def) => {
    const range = workRange(def, 'pacing', 'meters')
    return (range.min + range.max) / 2
  },
  rx: (def) => {
    const range = workRange(def, 'sprint', 'meters')
    return (range.min + range.max) / 2
  },
}

interface BuiltPiece {
  known: boolean
  expectsWeight: boolean
  hasWeight: boolean
  numericReps: number | null
  seconds: Record<LevelId, number>
}

const WOD_TYPES = new Set<WodType>(['for_time', 'amrap', 'emom'])

export function estimateCatalog(input: LevelWodInput): LevelTargets {
  const blocks = expandBlocks(input).map((block) => block.map(buildPiece))
  const pieces = blocks.flat()
  const confidence = confidenceOf(pieces)
  const note = catalogNote(confidence)
  if (input.type === 'amrap') {
    const cap = input.timeCapSec ?? 12 * 60
    const block = blocks[0] ?? []
    return {
      source: 'catalog',
      confidence,
      note,
      scaled: amrapMark(block, cap, 'scaled'),
      intermediate: amrapMark(block, cap, 'intermediate'),
      rx: amrapMark(block, cap, 'rx'),
    }
  }
  if (input.type === 'emom') {
    const minutes = Math.max(1, Math.round((input.timeCapSec ?? 60) / 60))
    const block = blocks[0] ?? []
    return {
      source: 'catalog',
      confidence,
      note,
      scaled: emomMark(block, minutes, 'scaled'),
      intermediate: emomMark(block, minutes, 'intermediate'),
      rx: emomMark(block, minutes, 'rx'),
    }
  }
  return {
    source: 'catalog',
    confidence,
    note,
    scaled: forTimeMark(blocks, 'scaled'),
    intermediate: forTimeMark(blocks, 'intermediate'),
    rx: forTimeMark(blocks, 'rx'),
  }
}

export function acceptGeminiTargets(
  type: WodType,
  raw: unknown,
  catalog: LevelTargets,
  exerciseReps: string[],
): LevelTargets | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>
  const scaled = markFrom(type, body.scaled)
  const intermediate = markFrom(type, body.intermediate)
  const rx = markFrom(type, body.rx)
  if (!scaled || !intermediate || !rx) return null
  const perRound = type === 'amrap' ? repsPerRound(exerciseReps) : null
  const marks = [scaled, intermediate, rx]
  if (!inOrder(type, marks, perRound)) return null
  if (marks.some((mark, index) => !nearCatalog(type, mark, [catalog.scaled, catalog.intermediate, catalog.rx][index], perRound))) {
    return null
  }
  const confidence =
    body.confidence === 'low' || body.confidence === 'medium' || body.confidence === 'high'
      ? body.confidence
      : catalog.confidence
  return {
    source: 'gemini',
    confidence,
    note: cleanNote(body.note, 'Ritmos ajustados según la carga del WOD.'),
    scaled,
    intermediate,
    rx,
  }
}

export function readStoredTargets(value: unknown, type: WodType): LevelTargets | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  if (body.source !== 'catalog' && body.source !== 'gemini') return null
  const scaled = markFrom(type, body.scaled)
  const intermediate = markFrom(type, body.intermediate)
  const rx = markFrom(type, body.rx)
  if (!scaled || !intermediate || !rx) return null
  const confidence =
    body.confidence === 'low' || body.confidence === 'medium' || body.confidence === 'high' ? body.confidence : 'medium'
  const note = typeof body.note === 'string' && body.note.trim() ? cleanNote(body.note, '') : null
  return { source: body.source, confidence, note: note || null, scaled, intermediate, rx }
}

export function parseLevelInput(value: unknown): LevelWodInput | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  if (typeof body.type !== 'string' || !WOD_TYPES.has(body.type as WodType)) return null
  const type = body.type as WodType
  const rounds = typeof body.rounds === 'number' && Number.isInteger(body.rounds) ? body.rounds : 1
  if (rounds < 1 || rounds > 30) return null
  let timeCapSec: number | null = null
  if (body.timeCapSec != null) {
    if (typeof body.timeCapSec !== 'number' || !Number.isInteger(body.timeCapSec)) return null
    if (body.timeCapSec < 60 || body.timeCapSec > 10800) return null
    timeCapSec = body.timeCapSec
  }
  if ((type === 'amrap' || type === 'emom') && timeCapSec == null) return null
  if (!Array.isArray(body.exercises) || body.exercises.length < 1 || body.exercises.length > 40) return null
  const exercises: LevelExerciseInput[] = []
  for (const item of body.exercises) {
    if (!item || typeof item !== 'object') return null
    const row = item as Record<string, unknown>
    if (typeof row.name !== 'string' || typeof row.reps !== 'string') return null
    const name = row.name.trim()
    const reps = row.reps.trim()
    if (!name || !reps || name.length > 80 || reps.length > 24) return null
    let round = 1
    if (row.round != null) {
      if (typeof row.round !== 'number' || !Number.isInteger(row.round) || row.round < 1 || row.round > 30) return null
      round = row.round
    }
    let weightKg: number | null = null
    if (row.weightKg != null) {
      if (typeof row.weightKg !== 'number' || !Number.isFinite(row.weightKg)) return null
      const rounded = Math.round(row.weightKg * 10) / 10
      if (rounded < 1 || rounded > 300) return null
      weightKg = rounded
    }
    exercises.push({ name, reps, round, weightKg })
  }
  return { type, rounds, timeCapSec, exercises }
}

export function readLevel(
  type: WodType,
  targets: LevelTargets,
  score: WodScoreSnapshot,
  exerciseReps: string[],
): LevelReading | null {
  if (type === 'emom' && targets.scaled.reps === 0 && targets.intermediate.reps === 0 && targets.rx.reps === 0) {
    return null
  }
  const perRound = type === 'amrap' ? repsPerRound(exerciseReps) : null
  const user = compareValue(type, score, perRound)
  if (!Number.isFinite(user)) return null
  let reached: LevelId | null = null
  const pending: { id: LevelId; mark: LevelMark }[] = []
  for (const level of LEVELS) {
    const mark = targets[level.id]
    const target = compareValue(type, mark, perRound)
    const clears = type === 'for_time' ? user <= target : user >= target
    if (clears) reached = level.id
    else pending.push({ id: level.id, mark })
  }
  const gaps = summarizeGaps(
    pending.map((item) => ({
      amount: gapAmount(type, score, item.mark, perRound),
      name: LEVEL_NAME[item.id],
    })),
  )
  if (reached == null) {
    return { level: 'below_scaled', summary: gaps ? `Por debajo de escalado. ${gaps}` : 'Por debajo de escalado.' }
  }
  if (!gaps) return { level: reached, summary: `Estás en ${LEVEL_NAME[reached]}.` }
  return { level: reached, summary: `Estás en ${LEVEL_NAME[reached]}. ${gaps}` }
}

export function levelMarkLabel(type: WodType, mark: LevelMark): string {
  return formatScoreLabel(type, mark)
}

function forTimeMark(blocks: BuiltPiece[][], level: LevelId): LevelMark {
  let total = 0
  blocks.forEach((block, index) => {
    total += blockSeconds(block, level, FATIGUE[level] ** index)
    if (index < blocks.length - 1) total += BETWEEN[level]
  })
  return { elapsedSec: Math.max(1, Math.round(total)), rounds: null, reps: null }
}

function amrapMark(block: BuiltPiece[], cap: number, level: LevelId): LevelMark {
  let elapsed = 0
  let full = 0
  let extra = 0
  for (let index = 0; index < 300; index += 1) {
    const fatigue = FATIGUE[level] ** index
    const work = blockSeconds(block, level, fatigue)
    if (work <= 0) break
    if (elapsed + work > cap) {
      extra = partialReps(block, cap - elapsed, level, fatigue)
      break
    }
    full += 1
    elapsed += work
    if (elapsed + BETWEEN[level] > cap) break
    elapsed += BETWEEN[level]
  }
  return { elapsedSec: null, rounds: full, reps: extra }
}

function emomMark(block: BuiltPiece[], minutes: number, level: LevelId): LevelMark {
  const prescribed = block.reduce((sum, piece) => sum + (piece.numericReps ?? 0), 0)
  const work = blockSeconds(block, level, 1)
  const perMinute = work <= 60 ? prescribed : Math.floor((prescribed * 60) / work)
  return { elapsedSec: null, rounds: null, reps: Math.min(9999, perMinute * minutes) }
}

function blockSeconds(block: BuiltPiece[], level: LevelId, fatigue: number): number {
  let total = 0
  block.forEach((piece, index) => {
    total += piece.seconds[level] * fatigue
    if (index < block.length - 1) total += TRANSITION[level]
  })
  return total
}

function partialReps(block: BuiltPiece[], remainder: number, level: LevelId, fatigue: number): number {
  let left = remainder
  let reps = 0
  for (let index = 0; index < block.length && left > 0; index += 1) {
    const piece = block[index]
    const sec = piece.seconds[level] * fatigue
    const gap = index < block.length - 1 ? TRANSITION[level] : 0
    if (sec <= 0) {
      left -= gap
      continue
    }
    if (left >= sec) {
      reps += piece.numericReps ?? 0
      left -= sec + gap
      continue
    }
    if (piece.numericReps != null) reps += Math.floor((piece.numericReps * left) / sec)
    break
  }
  return reps
}

function expandBlocks(input: LevelWodInput): LevelExerciseInput[][] {
  const groups = new Map<number, LevelExerciseInput[]>()
  for (const exercise of input.exercises) {
    const round = exercise.round ?? 1
    const list = groups.get(round) ?? []
    list.push(exercise)
    groups.set(round, list)
  }
  const ordered = [...groups.entries()].sort((a, b) => a[0] - b[0]).map((entry) => entry[1])
  if (input.type !== 'for_time' || ordered.length !== 1) return ordered.length > 0 ? ordered : [[]]
  const times = Math.min(30, Math.max(1, input.rounds))
  return Array.from({ length: times }, () => ordered[0])
}

function buildPiece(exercise: LevelExerciseInput): BuiltPiece {
  const movement = EXERCISES.find((item) => item.name.toLowerCase() === exercise.name.trim().toLowerCase()) ?? null
  const cardio = movement ? null : (CARDIO.find((item) => item.label.toLowerCase() === exercise.name.trim().toLowerCase())?.id ?? null)
  const amount = parseAmount(exercise.reps)
  const weight = exercise.weightKg ?? null
  const seconds: Record<LevelId, number> = { scaled: 1, intermediate: 1, rx: 1 }
  let known = false
  let numericReps: number | null = null

  if (movement && amount.meters != null && exerciseUnits(movement).includes('meters')) {
    known = true
    const factor = loadFactor(movement.id, weight)
    for (const level of LEVELS) {
      seconds[level.id] = Math.max(1, Math.round(METER_SEC[level.id](movement) * amount.meters * factor))
    }
  } else if (movement && amount.reps != null) {
    known = true
    numericReps = amount.reps
    const factor = loadFactor(movement.id, weight)
    for (const level of LEVELS) {
      seconds[level.id] = Math.max(1, Math.round(REP_SEC[level.id](movement) * amount.reps * factor))
    }
  } else if (cardio && amount.meters != null) {
    known = true
    for (const level of LEVELS) {
      seconds[level.id] = Math.max(1, Math.round((amount.meters / 1000) * DISTANCE_PACE[cardio][level.id]))
    }
  } else if (cardio && amount.calories != null) {
    known = true
    for (const level of LEVELS) {
      seconds[level.id] = Math.max(1, Math.round(amount.calories * CAL_PACE[cardio][level.id]))
    }
  } else if (amount.reps != null) {
    numericReps = amount.reps
    for (const level of LEVELS) seconds[level.id] = Math.max(1, Math.round(GENERIC_SEC[level.id] * amount.reps))
  } else if (amount.meters != null) {
    for (const level of LEVELS) {
      seconds[level.id] = Math.max(1, Math.round((amount.meters / 1000) * DISTANCE_PACE.run[level.id]))
    }
  } else if (amount.calories != null) {
    for (const level of LEVELS) seconds[level.id] = Math.max(1, Math.round(amount.calories * CAL_PACE.rowerg[level.id]))
  } else {
    numericReps = 10
    for (const level of LEVELS) seconds[level.id] = Math.max(1, Math.round(GENERIC_SEC[level.id] * 10))
  }

  return {
    known,
    expectsWeight: movement != null && Object.prototype.hasOwnProperty.call(REFERENCE_KG, movement.id),
    hasWeight: weight != null,
    numericReps,
    seconds,
  }
}

function loadFactor(id: string, weightKg: number | null): number {
  const reference = REFERENCE_KG[id]
  if (reference == null || weightKg == null) return 1
  return Math.min(1.7, Math.max(0.75, 1 + 0.4 * (weightKg / reference - 1)))
}

function parseAmount(reps: string): { reps: number | null; meters: number | null; calories: number | null } {
  const text = reps.trim().toLowerCase().replace(',', '.')
  const meters = /^(\d+(?:\.\d+)?)\s*m$/.exec(text)
  if (meters) return { reps: null, meters: Number(meters[1]), calories: null }
  const calories = /^(\d+(?:\.\d+)?)\s*cal$/.exec(text)
  if (calories) return { reps: null, meters: null, calories: Number(calories[1]) }
  if (/^\d+$/.test(text)) return { reps: Number(text), meters: null, calories: null }
  return { reps: null, meters: null, calories: null }
}

function confidenceOf(pieces: BuiltPiece[]): LevelConfidence {
  if (pieces.length === 0 || pieces.some((piece) => !piece.known)) return 'low'
  if (pieces.some((piece) => piece.expectsWeight && !piece.hasWeight)) return 'medium'
  return 'high'
}

function catalogNote(confidence: LevelConfidence): string {
  if (confidence === 'low') return 'Algún movimiento no está en el catálogo; el ritmo es aproximado.'
  if (confidence === 'medium') return 'Ritmos del simulador. Falta peso en algún movimiento de carga.'
  return 'Ritmos del simulador, con más descanso en escalado y menos en RX.'
}

function markFrom(type: WodType, value: unknown): LevelMark | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (type === 'for_time') {
    const elapsedSec = asInt(row.elapsedSec, 1, 21600)
    if (elapsedSec == null) return null
    return { elapsedSec, rounds: null, reps: null }
  }
  if (type === 'amrap') {
    const rounds = asInt(row.rounds, 0, 999)
    const reps = asInt(row.reps, 0, 9999)
    if (rounds == null || reps == null || (rounds === 0 && reps === 0)) return null
    return { elapsedSec: null, rounds, reps }
  }
  const reps = asInt(row.reps, 0, 9999)
  if (reps == null) return null
  return { elapsedSec: null, rounds: null, reps }
}

function asInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) return null
  return value
}

function inOrder(type: WodType, marks: LevelMark[], perRound: number | null): boolean {
  const values = marks.map((mark) => compareValue(type, mark, perRound))
  if (values.some((value) => !Number.isFinite(value))) return false
  if (type === 'for_time') return values[0] >= values[1] && values[1] >= values[2]
  return values[0] <= values[1] && values[1] <= values[2]
}

function nearCatalog(type: WodType, mark: LevelMark, catalog: LevelMark, perRound: number | null): boolean {
  const got = compareValue(type, mark, perRound)
  const base = compareValue(type, catalog, perRound)
  if (!Number.isFinite(got) || !Number.isFinite(base) || got <= 0 || base <= 0) return false
  const ratio = got / base
  return ratio >= 0.35 && ratio <= 3
}

function cleanNote(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const note = value.replace(/\s+/g, ' ').trim()
  if (!note) return fallback
  return note.slice(0, 180)
}

function gapAmount(type: WodType, score: WodScoreSnapshot, target: LevelMark, perRound: number | null): string {
  if (type === 'for_time') return formatDuration((score.elapsedSec ?? 0) - (target.elapsedSec ?? 0))
  if (perRound != null) {
    return unit(compareValue(type, target, perRound) - compareValue(type, score, perRound), 'rep', 'reps')
  }
  if (type === 'emom') return unit((target.reps ?? 0) - (score.reps ?? 0), 'rep', 'reps')
  const rounds = (target.rounds ?? 0) - (score.rounds ?? 0)
  const reps = (target.reps ?? 0) - (score.reps ?? 0)
  if (rounds > 0 && reps > 0) return `${unit(rounds, 'ronda', 'rondas')} y ${unit(reps, 'rep', 'reps')}`
  if (rounds > 0) return unit(rounds, 'ronda', 'rondas')
  return unit(reps, 'rep', 'reps')
}

function summarizeGaps(parts: { amount: string; name: string }[]): string | null {
  if (parts.length === 0) return null
  const same = parts.every((part) => part.amount === parts[0].amount)
  if (same && parts.length > 1) return `Te faltan ${parts[0].amount} para ${joinNames(parts.map((part) => part.name))}.`
  if (parts.length === 1) return `Te faltan ${parts[0].amount} para ${parts[0].name}.`
  const last = parts[parts.length - 1]
  const head = parts
    .slice(0, -1)
    .map((part) => `${part.amount} para ${part.name}`)
    .join(', ')
  return `Te faltan ${head} y ${last.amount} para ${last.name}.`
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} y ${names[1]}`
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}

function unit(amount: number, singular: string, plural: string): string {
  const value = Math.max(0, Math.round(amount))
  return `${value} ${value === 1 ? singular : plural}`
}

function formatDuration(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds))
  if (total < 60) return total === 1 ? '1 s' : `${total} s`
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
