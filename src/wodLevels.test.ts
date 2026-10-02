import assert from 'node:assert/strict'
import { acceptGeminiTargets, estimateCatalog, parseLevelInput, readLevel, readStoredTargets } from './wodLevels.ts'

const squats = estimateCatalog({
  type: 'for_time',
  rounds: 1,
  timeCapSec: null,
  exercises: [{ name: 'Air squats', reps: '10' }],
})

assert.equal(squats.scaled.elapsedSec, 13)
assert.equal(squats.intermediate.elapsedSec, 12)
assert.equal(squats.rx.elapsedSec, 8)
assert.ok((squats.scaled.elapsedSec ?? 0) >= (squats.intermediate.elapsedSec ?? 0))
assert.ok((squats.intermediate.elapsedSec ?? 0) >= (squats.rx.elapsedSec ?? 0))

const twoRounds = estimateCatalog({
  type: 'for_time',
  rounds: 2,
  timeCapSec: null,
  exercises: [{ name: 'Air squats', reps: '10' }],
})
assert.equal(twoRounds.intermediate.elapsedSec, 33)

const light = estimateCatalog({
  type: 'for_time',
  rounds: 1,
  timeCapSec: null,
  exercises: [{ name: 'Thruster', reps: '21', weightKg: null }],
})
const heavy = estimateCatalog({
  type: 'for_time',
  rounds: 1,
  timeCapSec: null,
  exercises: [{ name: 'Thruster', reps: '21', weightKg: 60 }],
})
assert.ok((heavy.intermediate.elapsedSec ?? 0) > (light.intermediate.elapsedSec ?? 0))

const carry = estimateCatalog({
  type: 'for_time',
  rounds: 1,
  timeCapSec: null,
  exercises: [{ name: 'Farmer carry', reps: '20 m', weightKg: 24 }],
})
assert.equal(carry.scaled.elapsedSec, 36)
assert.equal(carry.intermediate.elapsedSec, 30)
assert.equal(carry.rx.elapsedSec, 17)
assert.equal(carry.confidence, 'high')

const box = estimateCatalog({
  type: 'for_time',
  rounds: 1,
  timeCapSec: null,
  exercises: [{ name: 'Box step', reps: '10', weightKg: null }],
})
assert.equal(box.scaled.elapsedSec, 26)
assert.equal(box.intermediate.elapsedSec, 23)
assert.equal(box.rx.elapsedSec, 15)
assert.equal(box.confidence, 'high')

const loadedBox = estimateCatalog({
  type: 'for_time',
  rounds: 1,
  timeCapSec: null,
  exercises: [{ name: 'Box step', reps: '10', weightKg: 20 }],
})
assert.equal(loadedBox.intermediate.elapsedSec, 31)
assert.ok((loadedBox.intermediate.elapsedSec ?? 0) > (box.intermediate.elapsedSec ?? 0))

const plate = estimateCatalog({
  type: 'for_time',
  rounds: 1,
  timeCapSec: null,
  exercises: [{ name: 'Burpees plate', reps: '10', weightKg: 15 }],
})
assert.equal(plate.intermediate.elapsedSec, 37)
assert.equal(plate.confidence, 'high')

const heavyPlate = estimateCatalog({
  type: 'for_time',
  rounds: 1,
  timeCapSec: null,
  exercises: [{ name: 'Burpees plate', reps: '10', weightKg: 25 }],
})
assert.ok((heavyPlate.intermediate.elapsedSec ?? 0) > (plate.intermediate.elapsedSec ?? 0))

const sitUps = estimateCatalog({
  type: 'for_time',
  rounds: 1,
  timeCapSec: null,
  exercises: [{ name: 'Sit-ups', reps: '10', weightKg: null }],
})
assert.equal(sitUps.intermediate.elapsedSec, 16)
assert.equal(sitUps.confidence, 'high')

const loadedSitUps = estimateCatalog({
  type: 'for_time',
  rounds: 1,
  timeCapSec: null,
  exercises: [{ name: 'Sit-ups', reps: '10', weightKg: 10 }],
})
assert.equal(loadedSitUps.intermediate.elapsedSec, 22)
assert.ok((loadedSitUps.intermediate.elapsedSec ?? 0) > (sitUps.intermediate.elapsedSec ?? 0))

const slamBall = estimateCatalog({
  type: 'for_time',
  rounds: 1,
  timeCapSec: null,
  exercises: [{ name: 'Slam ball', reps: '10', weightKg: 9 }],
})
assert.equal(slamBall.scaled.elapsedSec, 24)
assert.equal(slamBall.intermediate.elapsedSec, 21)
assert.equal(slamBall.rx.elapsedSec, 14)
assert.equal(slamBall.confidence, 'high')

const heavySlam = estimateCatalog({
  type: 'for_time',
  rounds: 1,
  timeCapSec: null,
  exercises: [{ name: 'Slam ball', reps: '10', weightKg: 20 }],
})
assert.ok((heavySlam.intermediate.elapsedSec ?? 0) > (slamBall.intermediate.elapsedSec ?? 0))

const unknown = estimateCatalog({
  type: 'for_time',
  rounds: 1,
  timeCapSec: null,
  exercises: [{ name: 'Pistols', reps: '10' }],
})
assert.equal(unknown.confidence, 'low')

const amrap = estimateCatalog({
  type: 'amrap',
  rounds: 1,
  timeCapSec: 10 * 60,
  exercises: [
    { name: 'Air squats', reps: '10' },
    { name: 'Push-ups', reps: '10' },
  ],
})
assert.ok((amrap.rx.rounds ?? 0) >= (amrap.intermediate.rounds ?? 0))
assert.ok((amrap.intermediate.rounds ?? 0) >= (amrap.scaled.rounds ?? 0))

const reading = readLevel(
  'for_time',
  {
    source: 'catalog',
    confidence: 'high',
    note: null,
    scaled: { elapsedSec: 540, rounds: null, reps: null },
    intermediate: { elapsedSec: 390, rounds: null, reps: null },
    rx: { elapsedSec: 270, rounds: null, reps: null },
  },
  { elapsedSec: 420, rounds: null, reps: null },
  [],
)
assert.equal(reading?.level, 'scaled')
assert.equal(reading?.summary, 'Estás en escalado. Te faltan 30 s para intermedio y 2:30 para RX.')

const gemini = acceptGeminiTargets(
  'for_time',
  {
    scaled: { elapsedSec: 15 },
    intermediate: { elapsedSec: 12 },
    rx: { elapsedSec: 9 },
    confidence: 'high',
    note: 'Air squats sin carga.',
  },
  squats,
  ['10'],
)
assert.equal(gemini?.source, 'gemini')
assert.equal(gemini?.rx.elapsedSec, 9)

const rejected = acceptGeminiTargets(
  'for_time',
  {
    scaled: { elapsedSec: 8 },
    intermediate: { elapsedSec: 12 },
    rx: { elapsedSec: 20 },
    confidence: 'high',
    note: 'Orden imposible.',
  },
  squats,
  ['10'],
)
assert.equal(rejected, null)

const stored = readStoredTargets(
  {
    source: 'catalog',
    confidence: 'high',
    note: 'Ritmos del simulador.',
    scaled: { elapsedSec: 13, rounds: null, reps: null },
    intermediate: { elapsedSec: 12, rounds: null, reps: null },
    rx: { elapsedSec: 8, rounds: null, reps: null },
  },
  'for_time',
)
assert.equal(stored?.intermediate.elapsedSec, 12)
assert.equal(parseLevelInput({ type: 'amrap', exercises: [] }), null)
