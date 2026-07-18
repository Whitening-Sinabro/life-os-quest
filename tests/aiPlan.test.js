import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapProfileToRequest, isPersonalizable, slotKey, buildAiOverlay, aiSlotFor } from '../src/aiPlan.js'

const FULL = {
  goals: ['selfdev'], dream: 'become fluent in English',
  currentState: { age: '20대', job: '직장인' },
  pattern: { sleep: '7시간', activity: '독서' }, duration: '4주',
}

test('mapProfileToRequest maps dream->goalText and passes the 5 fields', () => {
  const out = mapProfileToRequest(FULL)
  assert.equal(out.schemaVersion, '2.0')
  assert.equal(out.profile.goalText, 'become fluent in English')
  assert.deepEqual(out.profile.goals, ['selfdev'])
  assert.deepEqual(out.profile.currentState, { age: '20대', job: '직장인' })
  assert.deepEqual(out.profile.pattern, { sleep: '7시간', activity: '독서' })
  assert.equal(out.profile.duration, '4주')
})

test('mapProfileToRequest coerces missing/mistyped fields to schema-valid empties', () => {
  const out = mapProfileToRequest({ dream: undefined, goals: 'nope', currentState: null })
  assert.equal(out.profile.goalText, '')
  assert.deepEqual(out.profile.goals, [])
  assert.deepEqual(out.profile.currentState, {})
  assert.deepEqual(out.profile.pattern, {})
  assert.equal(out.profile.duration, '')

  const nullOut = mapProfileToRequest(null)
  assert.deepEqual(nullOut.profile.goals, [])
  assert.equal(nullOut.profile.goalText, '')
})

test('isPersonalizable is true only for a complete profile', () => {
  assert.equal(isPersonalizable(FULL), true)
  assert.equal(isPersonalizable({ ...FULL, dream: '' }), false)
  assert.equal(isPersonalizable({ ...FULL, dream: '   ' }), false)
  assert.equal(isPersonalizable({ ...FULL, goals: [] }), false)
  assert.equal(isPersonalizable({ ...FULL, currentState: undefined }), false)
  assert.equal(isPersonalizable({ ...FULL, pattern: undefined }), false)
  assert.equal(isPersonalizable({ ...FULL, duration: '' }), false)
  assert.equal(isPersonalizable({ ...FULL, duration: '   ' }), false)
  assert.equal(isPersonalizable(null), false)
})

// The app's default v1 week-1 roster (from weeklyMissionPlans.v1.lifeDesign via getDefaultWeekSchedule).
const DEFAULT_V1 = {
  mon: ['reading', 'workout', 'parent-talk'], tue: ['reading'],
  wed: ['reading', 'workout', 'parent-talk'], thu: ['reading'],
  fri: ['reading', 'workout', 'parent-talk'], sat: [],
  sun: ['weekend-review', 'workout', 'parent-talk'],
}

function quest(id, category, objectiveEn, extra = {}) {
  return {
    id, category, estimatedMinutes: 30,
    title: null, subtitle: null, resourceRef: null, unitIndex: null, unitLabel: null,
    objective: { ko: objectiveEn, en: objectiveEn }, meta: { xp: 20, statRewards: {} },
    ...extra,
  }
}

function modelResult(quests, weekSchedule) {
  return {
    schemaVersion: '2.0',
    planMeta: { source: 'model', goalSummary: { ko: '성장', en: 'growth' }, summaryLines: [] },
    quests, weekSchedule,
  }
}

test('buildAiOverlay distributes reading quests across reading slot-days in order', () => {
  const result = modelResult(
    [
      quest('r1', 'reading', 'Read ch.1', { title: 'Atomic Habits', resourceRef: 'atomic', unitLabel: 'Ch.1' }),
      quest('r2', 'reading', 'Read ch.2', { title: 'Atomic Habits', resourceRef: 'atomic', unitLabel: 'Ch.2' }),
      quest('v1', 'video', 'Watch the lesson'),
      quest('w1', 'workout', 'Walk 30 min'),
      quest('weekend-review', 'reading', 'Weekly review'),
    ],
    { mon: ['r1', 'w1'], tue: ['r2'], wed: ['v1'], thu: [], fri: [], sat: [], sun: ['weekend-review'] },
  )
  const overlay = buildAiOverlay(result, 'v1', 1, DEFAULT_V1)

  assert.equal(overlay.slots[slotKey('mon', 'reading')].objectiveEn, 'Read ch.1')
  assert.equal(overlay.slots[slotKey('mon', 'reading')].title, 'Atomic Habits')
  assert.equal(overlay.slots[slotKey('mon', 'reading')].unitLabel, 'Ch.1')
  assert.equal(overlay.slots[slotKey('tue', 'reading')].objectiveEn, 'Read ch.2')
  // video folds into the reading bucket -> third reading slot (wed)
  assert.equal(overlay.slots[slotKey('wed', 'reading')].objectiveEn, 'Watch the lesson')
  // workout bucket onto the first workout slot (mon)
  assert.equal(overlay.slots[slotKey('mon', 'workout')].objectiveEn, 'Walk 30 min')
  // leftover reading slots untouched; weekend-review excluded
  assert.equal(overlay.slots[slotKey('thu', 'reading')], undefined)
  assert.equal(overlay.dropped.reading, 0)
  assert.equal(overlay.dropped.workout, 0)
  assert.deepEqual(overlay.goalSummary, { ko: '성장', en: 'growth' })
})

test('buildAiOverlay places filled missions into a schedule (so the day renders a card)', () => {
  const result = modelResult(
    [quest('r1', 'reading', 'a'), quest('w1', 'workout', 'b')],
    { mon: ['r1', 'w1'], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
  )
  const overlay = buildAiOverlay(result, 'v1', 1, DEFAULT_V1)
  // reading -> first reading slot-day (mon); workout -> first workout slot-day (mon)
  assert.deepEqual(overlay.schedule.mon, ['reading', 'workout'])
})

test('buildAiOverlay counts overflow when more quests than slots (no silent cap)', () => {
  const quests = []
  const mon = []
  for (let i = 0; i < 7; i++) { quests.push(quest(`r${i}`, 'reading', `read ${i}`)); mon.push(`r${i}`) }
  const overlay = buildAiOverlay(modelResult(quests, { mon, tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }), 'v1', 1, DEFAULT_V1)
  // 5 reading slots, 7 quests -> 2 dropped
  assert.equal(overlay.dropped.reading, 2)
  assert.equal(Object.keys(overlay.slots).length, 5)
})

test('buildAiOverlay returns null for a default (non-model) plan', () => {
  const result = modelResult([quest('r1', 'reading', 'x')], { mon: ['r1'], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] })
  result.planMeta.source = 'default'
  assert.equal(buildAiOverlay(result, 'v1', 1, DEFAULT_V1), null)
  assert.equal(buildAiOverlay(null, 'v1', 1, DEFAULT_V1), null)
})

test('aiSlotFor returns the slot only for the target version+week', () => {
  const result = modelResult([quest('r1', 'reading', 'Read ch.1')], { mon: ['r1'], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] })
  const overlay = buildAiOverlay(result, 'v1', 1, DEFAULT_V1)
  assert.equal(aiSlotFor(overlay, 'v1', 1, 'mon', 'reading').objectiveEn, 'Read ch.1')
  assert.equal(aiSlotFor(overlay, 'v1', 2, 'mon', 'reading'), null)
  assert.equal(aiSlotFor(overlay, 'v2', 1, 'mon', 'reading'), null)
  assert.equal(aiSlotFor(null, 'v1', 1, 'mon', 'reading'), null)
})

test('buildAiOverlay silently skips weekSchedule ids absent from quests[]', () => {
  const result = modelResult(
    [quest('r1', 'reading', 'Read ch.1')],
    { mon: ['r1', 'ghost_id'], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
  )
  const overlay = buildAiOverlay(result, 'v1', 1, DEFAULT_V1)
  assert.equal(overlay.slots[slotKey('mon', 'reading')].objectiveEn, 'Read ch.1')
  assert.equal(overlay.dropped.reading, 0) // ghost does not inflate the counter
  assert.equal(Object.keys(overlay.slots).length, 1)
})
