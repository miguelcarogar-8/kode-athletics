import {
  acceptGeminiTargets,
  estimateCatalog,
  levelMarkLabel,
  parseLevelInput,
  type LevelTargets,
  type LevelWodInput,
} from './wodLevels'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    scaled: { type: 'OBJECT', properties: markSchema() },
    intermediate: { type: 'OBJECT', properties: markSchema() },
    rx: { type: 'OBJECT', properties: markSchema() },
    confidence: { type: 'STRING', enum: ['low', 'medium', 'high'] },
    note: { type: 'STRING' },
  },
  required: ['scaled', 'intermediate', 'rx', 'confidence', 'note'],
}

export async function handleLevelRequest(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)
  const unauthorized = await requireUser(request)
  if (unauthorized) return unauthorized

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'El WOD no es válido.' }, 400)
  }
  const input = parseLevelInput(body)
  if (!input) return json({ error: 'El WOD no es válido.' }, 400)

  const catalog = estimateCatalog(input)
  const apiKey = readEnv('GEMINI_API_KEY')
  if (!apiKey) return json(fallback(catalog, 'Sin clave de Gemini en el servidor. Ritmos del simulador.'))

  try {
    const adjusted = await askGemini(input, catalog, apiKey)
    return json(adjusted)
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Gemini no respondió.'
    return json(fallback(catalog, reason))
  }
}

async function askGemini(input: LevelWodInput, catalog: LevelTargets, apiKey: string): Promise<LevelTargets> {
  const model = readEnv('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite'
  const response = await fetch(`${GEMINI_URL}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: 'Estimas ritmos de CrossFit sobre la prescripción escrita. Respondes solo JSON. No cambias movimientos ni kilos.',
          },
        ],
      },
      contents: [{ role: 'user', parts: [{ text: promptFor(input, catalog) }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 500,
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
      },
    }),
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(`Gemini respondió ${response.status}. Ritmos del simulador.`)
  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''
  let raw: unknown
  try {
    raw = JSON.parse(stripFence(text))
  } catch {
    throw new Error('Gemini no devolvió JSON. Ritmos del simulador.')
  }
  const accepted = acceptGeminiTargets(
    input.type,
    raw,
    catalog,
    input.exercises.map((exercise) => exercise.reps),
  )
  if (!accepted) throw new Error('Gemini devolvió ritmos fuera de rango. Ritmos del simulador.')
  return accepted
}

function promptFor(input: LevelWodInput, catalog: LevelTargets): string {
  const lines = input.exercises.map((exercise) => {
    const weight = exercise.weightKg == null ? '' : `, ${exercise.weightKg} kg`
    const round = exercise.round && exercise.round > 1 ? `ronda ${exercise.round}: ` : ''
    return `- ${round}${exercise.reps} ${exercise.name}${weight}`
  })
  const cap = input.timeCapSec == null ? 'sin cap' : `${Math.round(input.timeCapSec / 60)} min`
  return [
    'Estima tres ritmos para este mismo WOD. Escalado parte series y descansa. Intermedio es un atleta habitual de box. RX mueve bien esa carga, sin ser tiempo de Games.',
    'For time: elapsedSec en segundos; un tiempo mayor es más lento. Escalado >= intermedio >= RX.',
    'AMRAP: rounds y reps extra dentro del cap. Más trabajo es mejor: escalado <= intermedio <= RX.',
    'EMOM: reps totales. Más reps es mejor: escalado <= intermedio <= RX.',
    'Ajusta por los kilos. Puedes corregir la referencia, sin alejarte de un rango razonable.',
    'note: una frase en español, máximo 140 caracteres.',
    '',
    `Tipo: ${input.type}`,
    `Rondas del bloque: ${input.rounds}`,
    `Tiempo: ${cap}`,
    'Movimientos:',
    ...lines,
    '',
    `Referencia del simulador: escalado ${levelMarkLabel(input.type, catalog.scaled)}, intermedio ${levelMarkLabel(input.type, catalog.intermediate)}, RX ${levelMarkLabel(input.type, catalog.rx)}.`,
  ].join('\n')
}

async function requireUser(request: Request): Promise<Response | null> {
  const header = request.headers.get('authorization') ?? ''
  const token = /^Bearer\s+(\S+)$/i.exec(header)?.[1]
  if (!token) return json({ error: 'La sesión ha caducado. Vuelve a entrar.' }, 401)
  const url = readEnv('VITE_SUPABASE_URL') ?? readEnv('SUPABASE_URL')
  const anon = readEnv('VITE_SUPABASE_ANON_KEY') ?? readEnv('SUPABASE_ANON_KEY')
  if (!url || !anon) return json({ error: 'Falta la configuración de Supabase en el servidor.' }, 500)
  const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anon },
  })
  if (!response.ok) return json({ error: 'La sesión ha caducado. Vuelve a entrar.' }, 401)
  return null
}

function fallback(catalog: LevelTargets, note: string): LevelTargets {
  return { ...catalog, source: 'catalog', note }
}

function markSchema(): Record<string, unknown> {
  return {
    elapsedSec: { type: 'INTEGER' },
    rounds: { type: 'INTEGER' },
    reps: { type: 'INTEGER' },
  }
}

function stripFence(text: string): string {
  const trimmed = text.trim()
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed)
  return fenced ? fenced[1] : trimmed
}

function readEnv(name: string): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  const value = env?.[name]?.trim()
  return value ? value : undefined
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status })
}
