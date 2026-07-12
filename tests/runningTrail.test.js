import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  todayKey,
  sessionKind,
  isWorkout,
  isRunningPlan,
  parseWalkRun,
  weeklySummary,
  buildWeekTrail,
  weekProgress,
  trailPoints,
  smoothPath,
} from '../src/runningTrail.js'

// ---- todayKey ------------------------------------------------------------------------
// Jan 2020 anchors: Jan 5 2020 = Sunday, so getDay() 0..6 maps sun..sat.
test('todayKey maps JS getDay() (0=Sun) to our day keys', () => {
  assert.equal(todayKey(new Date(2020, 0, 5)), 'sun') // getDay()=0
  assert.equal(todayKey(new Date(2020, 0, 6)), 'mon') // getDay()=1
  assert.equal(todayKey(new Date(2020, 0, 11)), 'sat') // getDay()=6
})

// ---- sessionKind / isWorkout / isRunningPlan -----------------------------------------
test('sessionKind is driven by resourceRef prefix first, then category', () => {
  assert.equal(sessionKind({ resourceRef: 'run:c25k-w1' }), 'run')
  assert.equal(sessionKind({ resourceRef: 'strength:legs' }), 'strength')
  assert.equal(sessionKind({ category: 'reading' }), 'review')
  assert.equal(sessionKind({ category: 'workout' }), 'other') // workout != running unless run: ref
  assert.equal(sessionKind({}), 'other')
})

test('sessionKind is null-safe (no ref, no category)', () => {
  assert.equal(sessionKind(null), 'other')
  assert.equal(sessionKind(undefined), 'other')
})

test('isWorkout keys off category only', () => {
  assert.equal(isWorkout({ category: 'workout' }), true)
  assert.equal(isWorkout({ category: 'reading' }), false)
  assert.equal(isWorkout({}), false)
})

test('isRunningPlan is true only when a run session is actually present', () => {
  assert.equal(isRunningPlan([{ resourceRef: 'run:x' }, { category: 'reading' }]), true)
  assert.equal(isRunningPlan([{ category: 'workout' }, { category: 'reading' }]), false)
  assert.equal(isRunningPlan([]), false)
  assert.equal(isRunningPlan(), false)
})

// ---- parseWalkRun --------------------------------------------------------------------
test('parseWalkRun reads the interval clause "<run> 달리기 · <walk> 걷기" (· separator)', () => {
  assert.deepEqual(parseWalkRun('1분 달리기 · 2분 걷기'), {
    run: { n: 1, unit: '분' },
    walk: { n: 2, unit: '분' },
  })
})

test('parseWalkRun accepts the "/" separator (unitLabel form) and 초 unit', () => {
  assert.deepEqual(parseWalkRun('90초 달리기 / 60초 걷기'), {
    run: { n: 90, unit: '초' },
    walk: { n: 60, unit: '초' },
  })
})

test('parseWalkRun falls back to standalone durations when the separator is a word', () => {
  // "90초 달리기 후 2분 걷기를 반복" — no ·// between, but both durations present.
  assert.deepEqual(parseWalkRun('90초 달리기 후 2분 걷기를 반복'), {
    run: { n: 90, unit: '초' },
    walk: { n: 2, unit: '분' },
  })
})

test('parseWalkRun fallback handles walk-first prose order', () => {
  assert.deepEqual(parseWalkRun('2분 걷기 후 1분 달리기 반복'), {
    run: { n: 1, unit: '분' },
    walk: { n: 2, unit: '분' },
  })
})

test('parseWalkRun returns null for a continuous run (no walk half)', () => {
  assert.equal(parseWalkRun('30분 달리기'), null)
})

test('parseWalkRun returns null for a walk with no run', () => {
  assert.equal(parseWalkRun('5분 걷기'), null)
})

test('parseWalkRun returns null for prose with neither, and for non-strings', () => {
  assert.equal(parseWalkRun('근력 운동 3세트'), null)
  assert.equal(parseWalkRun(''), null)
  assert.equal(parseWalkRun(null), null)
  assert.equal(parseWalkRun(undefined), null)
  assert.equal(parseWalkRun(42), null)
})

test('parseWalkRun never invents a rep count — only {run, walk} keys', () => {
  const out = parseWalkRun('1분 달리기 · 2분 걷기')
  assert.deepEqual(Object.keys(out).sort(), ['run', 'walk'])
})

// ---- weeklySummary -------------------------------------------------------------------
const q = (id, xp, vitality, extra = {}) => ({
  id,
  meta: { xp, statRewards: { vitality } },
  ...extra,
})

test('weeklySummary sums total xp over all quests but earns only for done ones', () => {
  const quests = [q('a', 20, 3), q('b', 30, 5), q('c', 10, 0)]
  const out = weeklySummary(quests, { a: true, c: true })
  assert.equal(out.xpTotal, 60)
  assert.equal(out.xpEarned, 30) // a(20) + c(10)
  assert.equal(out.vitalityDelta, 3) // a only; c has 0
})

test('weeklySummary tolerates missing meta and empty inputs (no fabrication)', () => {
  assert.deepEqual(weeklySummary([{ id: 'x' }], { x: true }), {
    xpEarned: 0,
    xpTotal: 0,
    vitalityDelta: 0,
  })
  assert.deepEqual(weeklySummary(), { xpEarned: 0, xpTotal: 0, vitalityDelta: 0 })
})

// ---- buildWeekTrail / weekProgress ---------------------------------------------------
const RUN = (id) => ({ id, resourceRef: `run:${id}`, category: 'workout' })

test('buildWeekTrail yields 7 ordered nodes; session vs rest by schedule presence', () => {
  const quests = [RUN('m'), RUN('w')]
  const { nodes } = buildWeekTrail({
    weekSchedule: { mon: ['m'], wed: ['w'] },
    quests,
    today: 'mon',
    doneMap: {},
  })
  assert.equal(nodes.length, 7)
  assert.deepEqual(nodes.map((n) => n.dayKey), ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
  assert.equal(nodes[0].kind, 'session')
  assert.equal(nodes[0].isToday, true)
  assert.equal(nodes[1].kind, 'rest') // tue empty
})

test('buildWeekTrail marks a day done only when EVERY session on it is done', () => {
  const quests = [RUN('a'), RUN('b')]
  const { nodes } = buildWeekTrail({
    weekSchedule: { mon: ['a', 'b'] },
    quests,
    today: 'tue',
    doneMap: { a: true }, // only one of two
  })
  const mon = nodes.find((n) => n.dayKey === 'mon')
  assert.equal(mon.isDone, false)

  const { nodes: nodes2 } = buildWeekTrail({
    weekSchedule: { mon: ['a', 'b'] },
    quests,
    today: 'tue',
    doneMap: { a: true, b: true },
  })
  assert.equal(nodes2.find((n) => n.dayKey === 'mon').isDone, true)
})

test('buildWeekTrail drops schedule ids absent from quests (ghost -> rest, not phantom session)', () => {
  const { nodes } = buildWeekTrail({
    weekSchedule: { mon: ['ghost'] },
    quests: [],
    today: 'mon',
    doneMap: {},
  })
  const mon = nodes.find((n) => n.dayKey === 'mon')
  assert.equal(mon.kind, 'rest')
  assert.equal(mon.sessions.length, 0)
})

test('weekProgress counts only session days and agrees with the trail nodes (one denominator)', () => {
  const quests = [RUN('a'), RUN('b')]
  const { nodes } = buildWeekTrail({
    weekSchedule: { mon: ['a'], wed: ['b'] },
    quests,
    today: 'mon',
    doneMap: { a: true },
  })
  assert.deepEqual(weekProgress(nodes), { done: 1, total: 2 })
  assert.deepEqual(weekProgress([]), { done: 0, total: 0 })
})

// ---- trailPoints / smoothPath --------------------------------------------------------
test('trailPoints returns [] for n<=0 and a centered single point for n===1', () => {
  assert.deepEqual(trailPoints(0), [])
  assert.deepEqual(trailPoints(-3), [])
  const [only] = trailPoints(1, { width: 300, padX: 24 })
  assert.equal(only.x, 24 + 0.5 * (300 - 48)) // t=0.5 across the padded span
})

test('trailPoints spreads n points from padX to width-padX', () => {
  const pts = trailPoints(4, { width: 300, padX: 24, amp: 44 })
  assert.equal(pts.length, 4)
  assert.equal(pts[0].x, 24) // t=0
  assert.equal(pts[3].x, 276) // t=1 -> width-padX
})

test('smoothPath is empty/1-point safe and emits a cubic path for 2+ points', () => {
  assert.equal(smoothPath([]), '')
  assert.equal(smoothPath(), '')
  assert.equal(smoothPath([{ x: 5, y: 6 }]), 'M 5 6')
  const d = smoothPath([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }])
  assert.match(d, /^M 0 0/)
  assert.match(d, / C /)
})
