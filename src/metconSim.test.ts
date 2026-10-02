import assert from 'node:assert/strict'
import {
  CARDIO,
  EXERCISES,
  exampleMetcon,
  exerciseDef,
  formatClock,
  formatKg,
  formatRange,
  parseWeightKg,
  paceFit,
  paceFromSeconds,
  pieceLabel,
  piecePace,
  scaledSeconds,
  secondsForReps,
  secondsFromPace,
  simulate,
  type ExercisePiece,
} from './metconSim.ts'

assert.equal(CARDIO.length, 5)
assert.deepEqual(
  CARDIO.map((item) => item.id),
  ['run', 'bikerg', 'skierg', 'rowerg', 'assault'],
)
assert.equal(EXERCISES.length, 30)

const thruster = exerciseDef('thruster')
assert.equal(secondsForReps(thruster, 'pacing', 21), 58)
assert.equal(secondsForReps(thruster, 'sprint', 21), 42)
assert.equal(formatRange(thruster.pacing), '2,5–3,0 s/rep')
assert.equal(formatRange(thruster.sprint), '2,0 s/rep')
assert.equal(paceFit(thruster, 'pacing', 58, 21), 'inside')
assert.equal(paceFit(thruster, 'pacing', 40, 21), 'faster')
assert.equal(paceFit(thruster, 'pacing', 80, 21), 'slower')

const farmer = exerciseDef('farmer-carry')
assert.equal(secondsForReps(farmer, 'pacing', 20, 'meters'), 30)
assert.equal(secondsForReps(farmer, 'sprint', 20, 'meters'), 17)
assert.equal(formatRange(farmer.meterPacing ?? farmer.pacing, 'meters'), '1,2–1,8 s/m')
const farmerPiece: ExercisePiece = {
  id: 'farmer',
  kind: 'exercise',
  exerciseId: 'farmer-carry',
  reps: 20,
  unit: 'meters',
  weightKg: 24,
  paceMode: 'pacing',
  seconds: 30,
  transitionAfterSec: null,
}
assert.equal(pieceLabel(farmerPiece), '20 m Farmer carry · 24 kg')
assert.equal(piecePace(farmerPiece), '1,5 s/m')

const lunge = exerciseDef('lunge')
assert.equal(secondsForReps(lunge, 'pacing', 10), 17)
assert.equal(secondsForReps(lunge, 'pacing', 20, 'meters'), 33)

const boxStep = exerciseDef('box-step')
assert.equal(secondsForReps(boxStep, 'pacing', 10), 23)
assert.equal(formatRange(boxStep.pacing), '2,0–2,6 s/rep')
const boxStepOver = exerciseDef('box-step-over')
assert.equal(secondsForReps(boxStepOver, 'pacing', 10), 30)
const burpeePlate = exerciseDef('burpee-plate')
assert.equal(secondsForReps(burpeePlate, 'pacing', 10), 37)
assert.equal(formatRange(burpeePlate.pacing), '3,2–4,2 s/rep')
const sitUp = exerciseDef('sit-up')
assert.equal(secondsForReps(sitUp, 'pacing', 10), 16)
assert.equal(formatRange(sitUp.pacing), '1,4–1,8 s/rep')
const slam = exerciseDef('slam-ball')
assert.equal(secondsForReps(slam, 'pacing', 10), 21)
assert.equal(formatRange(slam.pacing), '1,8–2,4 s/rep')

const example = exampleMetcon()
const result = simulate(example.rounds, example.pieces)
assert.equal(result.steps[0]?.label, '400 m Correr')
assert.equal(result.steps[0]?.pace, '4:10 /km')
assert.equal(result.steps[1]?.label, '21 Thruster')
assert.equal(result.steps[2]?.label, '12 Pull-ups kipping')
assert.equal(result.perRoundSec, 100 + 58 + 16)
assert.equal(result.totalSec, 174 * 3)
assert.equal(result.steps.every((step) => step.kind === 'work'), true)
assert.equal(formatClock(result.totalSec), '8:42')

const withGaps = example.pieces.map((piece, index) => ({
  ...piece,
  transitionAfterSec: index === 0 ? 5 : index === 1 ? 8 : 10,
}))
const withTransition = simulate(example.rounds, withGaps)
assert.equal(withTransition.perRoundSec, 174 + 13)
assert.equal(withTransition.betweenRoundSec, 10)
assert.equal(withTransition.betweenRounds, 2)
assert.equal(withTransition.totalSec, (174 + 13) * 3 + 20)
assert.equal(withTransition.steps.filter((step) => step.kind === 'transition').length, 2)
assert.equal(simulate(1, withGaps).totalSec, 174 + 13)
assert.equal(simulate(1, withGaps).betweenRoundSec, 0)
assert.equal(
  simulate(3, [{ ...example.pieces[0], transitionAfterSec: 10 }]).totalSec,
  100 * 3 + 20,
)
assert.equal(secondsFromPace(400, 250), 100)
assert.equal(secondsFromPace(1000, 300), 300)
assert.equal(paceFromSeconds(400, 100), 250)
assert.equal(piecePace(example.pieces[0]), '4:10 /km')
assert.equal(formatClock(3661), '1:01:01')
assert.equal(formatClock(0), '0:00')

assert.equal(scaledSeconds(100, 400, 800), 200)
assert.equal(scaledSeconds(50, 0, 10), 50)
assert.equal(simulate(0, example.pieces).rounds, 1)
assert.equal(simulate(3, []).totalSec, 0)

const pullups = example.pieces[2]
assert.ok(pullups && pullups.kind === 'exercise')
assert.equal(piecePace(pullups), '1,3 s/rep')
assert.equal(pieceLabel(pullups), '12 Pull-ups kipping')
assert.equal(pieceLabel({ ...pullups, weightKg: 43 }), '12 Pull-ups kipping · 43 kg')
assert.equal(pieceLabel({ ...pullups, weightKg: 22.5 }), '12 Pull-ups kipping · 22,5 kg')
assert.equal(formatKg(60), '60 kg')
assert.equal(parseWeightKg('22,5'), 22.5)
assert.equal(parseWeightKg('0,5'), null)
assert.equal(parseWeightKg('301'), null)

const calories = {
  id: 'row',
  kind: 'cardio' as const,
  cardio: 'rowerg' as const,
  mode: 'cal' as const,
  calories: 15,
  distanceM: 500,
  paceSecPerKm: 150,
  seconds: 45,
  transitionAfterSec: null,
}
assert.equal(pieceLabel(calories), '15 cal RowErg')
assert.equal(piecePace(calories), '3 s/cal')

const amrap = simulate(1, example.pieces, { format: 'amrap', capSec: 12 * 60 })
assert.equal(amrap.fullRounds, 4)
assert.deepEqual(amrap.partial, ['96 m Correr'])
assert.equal(amrap.perRoundSec, 174)

const closing = example.pieces.map((piece, index) => ({
  ...piece,
  transitionAfterSec: index === example.pieces.length - 1 ? 10 : null,
}))
const amrapWithReturn = simulate(1, closing, { format: 'amrap', capSec: 12 * 60 })
assert.equal(amrapWithReturn.fullRounds, 3)
assert.equal(amrapWithReturn.perRoundSec, 174)
assert.equal(amrapWithReturn.betweenRoundSec, 10)
assert.deepEqual(amrapWithReturn.partial, ['400 m Correr', '21 Thruster', '7 Pull-ups kipping'])

const finishedAsTimeEnds = simulate(1, closing, { format: 'amrap', capSec: 174 })
assert.equal(finishedAsTimeEnds.fullRounds, 1)
assert.deepEqual(finishedAsTimeEnds.partial, [])

const amrapWithInternal = simulate(1, withGaps, { format: 'amrap', capSec: 12 * 60 })
assert.equal(amrapWithInternal.perRoundSec, 174 + 13)
assert.equal(amrapWithInternal.fullRounds, 3)
assert.deepEqual(amrapWithInternal.partial, ['400 m Correr', '8 Thruster'])

assert.equal(simulate(1, [], { format: 'amrap', capSec: 12 * 60 }).fullRounds, 0)
assert.equal(simulate(3, example.pieces).format, 'fortime')
assert.equal(simulate(3, example.pieces).totalSec, 174 * 3)
