import assert from 'node:assert/strict'
import { annotateScores } from './wodScore.ts'

const faster = annotateScores(
  'for_time',
  [
    { elapsedSec: 340, rounds: null, reps: null },
    { elapsedSec: 312, rounds: null, reps: null },
  ],
  ['21-15-9', '21-15-9'],
)
assert.equal(faster.bestLabel, '5:12')
assert.equal(faster.sinceFirstLabel, '28 s más rápido que la primera vez')
assert.equal(faster.items[1].label, '5:12')
assert.equal(faster.items[1].deltaLabel, '28 s más rápido que la anterior')
assert.equal(faster.items[1].improved, true)
assert.equal(faster.items[1].isBest, true)
assert.equal(faster.items[0].isBest, false)

const amrap = annotateScores(
  'amrap',
  [
    { elapsedSec: null, rounds: 4, reps: 8 },
    { elapsedSec: null, rounds: 5, reps: 2 },
  ],
  ['5', '10', '15'],
)
assert.equal(amrap.items[0].value, 4 * 30 + 8)
assert.equal(amrap.items[1].value, 5 * 30 + 2)
assert.equal(amrap.items[1].deltaLabel, '24 reps más que la anterior')
assert.equal(amrap.sinceFirstLabel, '24 reps más que la primera vez')

const slower = annotateScores(
  'for_time',
  [
    { elapsedSec: 300, rounds: null, reps: null },
    { elapsedSec: 320, rounds: null, reps: null },
  ],
  ['10'],
)
assert.equal(slower.items[0].isBest, true)
assert.equal(slower.items[1].improved, false)
assert.equal(slower.sinceFirstLabel, 'La primera marca sigue siendo la mejor')

const emom = annotateScores(
  'emom',
  [
    { elapsedSec: null, rounds: null, reps: 40 },
    { elapsedSec: null, rounds: null, reps: 48 },
  ],
  ['8'],
)
assert.equal(emom.bestLabel, '48 reps')
assert.equal(emom.items[1].deltaLabel, '8 reps más que la anterior')

const tied = annotateScores(
  'for_time',
  [
    { elapsedSec: 180, rounds: null, reps: null },
    { elapsedSec: 180, rounds: null, reps: null },
  ],
  ['15'],
)
assert.equal(tied.sinceFirstLabel, 'Misma marca en todos los intentos')
assert.equal(tied.items.every((item) => item.isBest), true)
