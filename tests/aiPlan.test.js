import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapProfileToRequest, isPersonalizable } from '../src/aiPlan.js'

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
