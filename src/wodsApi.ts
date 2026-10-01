import { normalizeWeightKg } from './metconSim'
import { supabase } from './supabase'
import { annotateScores, type WodType } from './wodScore'

export type { WodType }

export const WOD_TYPES: { id: WodType; label: string; hint: string }[] = [
  {
    id: 'for_time',
    label: 'For time',
    hint: 'Completa los ejercicios lo antes posible. La marca es el tiempo.',
  },
  {
    id: 'amrap',
    label: 'AMRAP',
    hint: 'Todas las rondas posibles en un tiempo fijo. La marca son rondas y repeticiones.',
  },
  {
    id: 'emom',
    label: 'EMOM',
    hint: 'Cada minuto, el trabajo indicado. La marca son las repeticiones hechas.',
  },
]

export interface WodExercise {
  id: number
  name: string
  reps: string
  round: number
  weightKg: number | null
}

export interface WodScore {
  id: number
  performedAt: string
  elapsedSec: number | null
  rounds: number | null
  reps: number | null
  notes: string | null
  value: number
  label: string
  deltaLabel: string | null
  improved: boolean | null
  isBest: boolean
}

export interface WodSummary {
  id: string
  name: string
  type: WodType
  timeCapSec: number | null
  createdAt: string
  exerciseCount: number
  scoreCount: number
  roundCount: number
  bestLabel: string | null
}

export interface WodDetail {
  id: string
  name: string
  type: WodType
  timeCapSec: number | null
  notes: string | null
  createdAt: string
  exercises: WodExercise[]
  scores: WodScore[]
  bestLabel: string | null
  sinceFirstLabel: string | null
  rounds: number
}

export interface CreateWodInput {
  name: string
  type: WodType
  timeCapMin?: number
  notes?: string
  rounds?: number
  exercises: { name: string; reps: string; round?: number; weightKg?: number | null }[]
}

export interface CreateWodScoreInput {
  performedAt: string
  elapsedSec?: number
  rounds?: number
  reps?: number
  notes?: string
}

interface WodRow {
  id: string
  name: string
  type: WodType
  time_cap_sec: number | null
  rounds: number | null
  notes: string | null
  created_at: string
}

interface ExerciseRow {
  id: number
  wod_id: string
  position: number
  round: number
  name: string
  reps: string
  weight_kg: number | string | null
}

interface ScoreRow {
  id: number
  wod_id: string
  performed_at: string
  elapsed_sec: number | null
  rounds: number | null
  reps: number | null
  notes: string | null
}

const MISSING_TABLE =
  'Faltan las tablas de WODs en Supabase. Ejecuta supabase/schema.sql en el editor SQL del proyecto.'

export function formatWodKind(type: WodType, timeCapSec: number | null, roundCount = 1): string {
  const minutes = timeCapSec == null ? null : Math.round(timeCapSec / 60)
  if (type === 'amrap') return minutes ? `AMRAP ${minutes} min` : 'AMRAP'
  if (type === 'emom') return minutes ? `EMOM ${minutes} min` : 'EMOM'
  const parts = ['For time']
  if (roundCount > 1) parts.push(`${roundCount} rondas`)
  if (minutes) parts.push(`cap ${minutes} min`)
  return parts.join(' · ')
}

export function countLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`
}

export async function listWods(): Promise<WodSummary[]> {
  const [wods, exercises, scores] = await Promise.all([
    client().from('wods').select('id, name, type, time_cap_sec, rounds, notes, created_at').order('created_at', { ascending: false }),
    client().from('wod_exercises').select('id, wod_id, position, round, name, reps'),
    client().from('wod_scores').select('id, wod_id, performed_at, elapsed_sec, rounds, reps, notes').order('performed_at', { ascending: true }).order('id', { ascending: true }),
  ])
  assertOk(wods.error)
  assertOk(exercises.error)
  assertOk(scores.error)
  const exerciseRows = asRows<ExerciseRow>(exercises.data)
  const scoreRows = asRows<ScoreRow>(scores.data)
  return asRows<WodRow>(wods.data).map((wod) => {
    const mineExercises = exerciseRows
      .filter((exercise) => exercise.wod_id === wod.id)
      .sort((a, b) => a.position - b.position)
    const mineScores = scoreRows
      .filter((score) => score.wod_id === wod.id)
      .sort(byPerformed)
    const annotated = annotateScores(
      wod.type,
      mineScores.map(toSnapshot),
      mineExercises.map((exercise) => exercise.reps),
    )
    return {
      id: wod.id,
      name: wod.name,
      type: wod.type,
      timeCapSec: wod.time_cap_sec,
      createdAt: wod.created_at,
      exerciseCount: mineExercises.length,
      scoreCount: mineScores.length,
      roundCount: blockRounds(wod.rounds, mineExercises),
      bestLabel: annotated.bestLabel,
    }
  })
}

export async function getWod(id: string): Promise<WodDetail> {
  return detail(id)
}

export async function createWod(input: CreateWodInput): Promise<WodDetail> {
  const userId = await currentUserId()
  const name = input.name.trim()
  if (!name || name.length > 80) throw new Error('Ponle un nombre al WOD.')
  const exercises = input.exercises.map((exercise, index) => {
    const exerciseName = exercise.name.trim()
    const reps = exercise.reps.trim()
    if (!exerciseName || !reps || exerciseName.length > 80 || reps.length > 24) {
      throw new Error('Cada ejercicio necesita nombre y repeticiones.')
    }
    const round = exercise.round ?? 1
    if (!Number.isInteger(round) || round < 1 || round > 30) {
      throw new Error('La ronda tiene que estar entre 1 y 30.')
    }
    const weightKg = exercise.weightKg == null ? null : normalizeWeightKg(exercise.weightKg)
    if (exercise.weightKg != null && weightKg == null) {
      throw new Error('El peso tiene que estar entre 1 y 300 kg.')
    }
    return { position: index, round, name: exerciseName, reps, weightKg }
  })
  if (exercises.length < 1 || exercises.length > 40) {
    throw new Error('El WOD necesita entre 1 y 40 movimientos.')
  }
  const rounds = input.type === 'for_time' ? (input.rounds ?? 1) : 1
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 30) {
    throw new Error('Las rondas tienen que estar entre 1 y 30.')
  }

  let timeCapSec: number | null = null
  if (input.type === 'amrap' || input.type === 'emom') {
    if (input.timeCapMin == null) throw new Error('Indica la duración en minutos.')
    timeCapSec = input.timeCapMin * 60
  } else if (input.timeCapMin != null) {
    timeCapSec = input.timeCapMin * 60
  }

  const inserted = await client()
    .from('wods')
    .insert({
      user_id: userId,
      name,
      type: input.type,
      time_cap_sec: timeCapSec,
      rounds,
      notes: cleanNotes(input.notes),
    })
    .select('id')
    .single()
  assertOk(inserted.error)
  const wodId = (inserted.data as { id: string }).id

  const savedExercises = await client()
    .from('wod_exercises')
    .insert(
      exercises.map((exercise) => ({
        wod_id: wodId,
        user_id: userId,
        position: exercise.position,
        round: exercise.round,
        name: exercise.name,
        reps: exercise.reps,
        weight_kg: exercise.weightKg,
      })),
    )
  if (savedExercises.error) {
    await client().from('wods').delete().eq('id', wodId)
    assertOk(savedExercises.error)
  }
  return detail(wodId)
}

export async function deleteWod(id: string): Promise<void> {
  const removed = await client().from('wods').delete().eq('id', id).select('id')
  assertOk(removed.error)
  if (!Array.isArray(removed.data) || removed.data.length === 0) {
    throw new Error('No se encontró el WOD.')
  }
}

export async function addWodScore(id: string, input: CreateWodScoreInput): Promise<WodDetail> {
  const userId = await currentUserId()
  const existing = await client().from('wods').select('id, type').eq('id', id).maybeSingle()
  assertOk(existing.error)
  const wod = existing.data as { id: string; type: WodType } | null
  if (!wod) throw new Error('No se encontró el WOD.')

  const performedAt = assertDate(input.performedAt)
  const score = { elapsed_sec: null as number | null, rounds: null as number | null, reps: null as number | null }
  if (wod.type === 'for_time') {
    if (input.elapsedSec == null) throw new Error('Indica el tiempo del WOD.')
    score.elapsed_sec = input.elapsedSec
  } else if (wod.type === 'amrap') {
    if (input.rounds == null) throw new Error('Indica las rondas.')
    const reps = input.reps ?? 0
    if (input.rounds === 0 && reps === 0) throw new Error('Indica rondas o repeticiones.')
    score.rounds = input.rounds
    score.reps = reps
  } else if (input.reps == null) {
    throw new Error('Indica las repeticiones.')
  } else {
    score.reps = input.reps
  }

  const inserted = await client().from('wod_scores').insert({
    wod_id: id,
    user_id: userId,
    performed_at: performedAt,
    elapsed_sec: score.elapsed_sec,
    rounds: score.rounds,
    reps: score.reps,
    notes: cleanNotes(input.notes),
  })
  assertOk(inserted.error)
  return detail(id)
}

export async function deleteWodScore(id: string, scoreId: number): Promise<WodDetail> {
  const removed = await client().from('wod_scores').delete().eq('id', scoreId).eq('wod_id', id).select('id')
  assertOk(removed.error)
  if (!Array.isArray(removed.data) || removed.data.length === 0) {
    throw new Error('No se encontró la marca.')
  }
  return detail(id)
}

async function detail(id: string): Promise<WodDetail> {
  const wodQuery = await client()
    .from('wods')
    .select('id, name, type, time_cap_sec, rounds, notes, created_at')
    .eq('id', id)
    .maybeSingle()
  assertOk(wodQuery.error)
  const wod = wodQuery.data as WodRow | null
  if (!wod) throw new Error('No se encontró el WOD.')

  const [exercises, scores] = await Promise.all([
    client()
      .from('wod_exercises')
      .select('id, wod_id, position, round, name, reps, weight_kg')
      .eq('wod_id', id)
      .order('round', { ascending: true })
      .order('position', { ascending: true }),
    client()
      .from('wod_scores')
      .select('id, wod_id, performed_at, elapsed_sec, rounds, reps, notes')
      .eq('wod_id', id)
      .order('performed_at', { ascending: true })
      .order('id', { ascending: true }),
  ])
  assertOk(exercises.error)
  assertOk(scores.error)
  const exerciseRows = asRows<ExerciseRow>(exercises.data)
  const scoreRows = asRows<ScoreRow>(scores.data).sort(byPerformed)
  const annotated = annotateScores(
    wod.type,
    scoreRows.map(toSnapshot),
    exerciseRows.map((exercise) => exercise.reps),
  )
  return {
    id: wod.id,
    name: wod.name,
    type: wod.type,
    timeCapSec: wod.time_cap_sec,
    notes: wod.notes,
    rounds: blockRounds(wod.rounds, exerciseRows),
    createdAt: wod.created_at,
    exercises: exerciseRows.map((exercise) => ({
      id: Number(exercise.id),
      name: exercise.name,
      reps: exercise.reps,
      round: Number(exercise.round ?? 1),
      weightKg: readWeightKg(exercise.weight_kg),
    })),
    scores: annotated.items.map((item) => ({
      id: Number(item.score.id),
      performedAt: item.score.performedAt,
      elapsedSec: item.score.elapsedSec,
      rounds: item.score.rounds,
      reps: item.score.reps,
      notes: item.score.notes,
      value: item.value,
      label: item.label,
      deltaLabel: item.deltaLabel,
      improved: item.improved,
      isBest: item.isBest,
    })),
    bestLabel: annotated.bestLabel,
    sinceFirstLabel: annotated.sinceFirstLabel,
  }
}

function toSnapshot(score: ScoreRow) {
  return {
    id: Number(score.id),
    performedAt: String(score.performed_at).slice(0, 10),
    elapsedSec: score.elapsed_sec,
    rounds: score.rounds,
    reps: score.reps,
    notes: score.notes,
  }
}

function byPerformed(a: ScoreRow, b: ScoreRow): number {
  const date = String(a.performed_at).localeCompare(String(b.performed_at))
  if (date !== 0) return date
  return Number(a.id) - Number(b.id)
}

function client() {
  if (!supabase) throw new Error('Faltan las claves de Supabase en el entorno.')
  return supabase
}

async function currentUserId(): Promise<string> {
  const { data, error } = await client().auth.getUser()
  if (error || !data.user) throw new Error('La sesión ha caducado. Vuelve a entrar.')
  return data.user.id
}

function assertOk(error: { message: string; code?: string } | null): void {
  if (!error) return
  const missing =
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    /schema cache/i.test(error.message) ||
    /does not exist/i.test(error.message)
  if (missing) throw new Error(MISSING_TABLE)
  if (/row-level security/i.test(error.message)) {
    throw new Error('No tienes permiso para guardar este WOD.')
  }
  throw new Error(error.message)
}

function blockRounds(stored: number | null | undefined, rows: { round?: number }[]): number {
  const fromColumn = Number(stored ?? 1)
  const distinct = rows.length === 0 ? 1 : new Set(rows.map((row) => Number(row.round ?? 1))).size
  const value = Math.max(Number.isInteger(fromColumn) && fromColumn > 0 ? fromColumn : 1, distinct)
  return value
}

function asRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : []
}

function readWeightKg(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null
  return normalizeWeightKg(typeof value === 'number' ? value : Number(value))
}

function cleanNotes(value: string | null | undefined): string | null {
  const notes = value?.trim() ?? ''
  return notes ? notes : null
}

function assertDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error('La fecha no es válida.')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('La fecha no es válida.')
  }
  return value
}
