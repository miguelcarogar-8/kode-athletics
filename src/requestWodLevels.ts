import { supabase } from './supabase'
import { readStoredTargets, type LevelTargets, type LevelWodInput } from './wodLevels'
import type { WodDetail } from './wodsApi'

export async function requestWodLevels(wod: Pick<WodDetail, 'type' | 'rounds' | 'timeCapSec' | 'exercises'>): Promise<LevelTargets> {
  if (!supabase) throw new Error('Faltan las claves de Supabase en el entorno.')
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new Error('La sesión ha caducado. Vuelve a entrar.')

  const payload: LevelWodInput = {
    type: wod.type,
    rounds: wod.rounds,
    timeCapSec: wod.timeCapSec,
    exercises: wod.exercises.map((exercise) => ({
      name: exercise.name,
      reps: exercise.reps,
      round: exercise.round,
      weightKg: exercise.weightKg,
    })),
  }
  const response = await fetch('/api/wod-levels', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify(payload),
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : 'No se pudieron calcular los niveles.'
    throw new Error(message)
  }
  const targets = readStoredTargets(body, wod.type)
  if (!targets) throw new Error('La respuesta de niveles no es válida.')
  return targets
}
