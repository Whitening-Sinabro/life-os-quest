// tests/aiFlow.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveAiSurface, deriveRehydrateAction } from '../src/aiFlow.js'

test('idle -> none', () => {
  assert.equal(deriveAiSurface({ aiStatus: 'idle', genPhase: 'cover', revealDismissed: false, hasGoalSummary: false }), 'none')
})
test('pending + cover -> cover', () => {
  assert.equal(deriveAiSurface({ aiStatus: 'pending', genPhase: 'cover', revealDismissed: false, hasGoalSummary: false }), 'cover')
})
test('pending + background -> chip-pending', () => {
  assert.equal(deriveAiSurface({ aiStatus: 'pending', genPhase: 'background', revealDismissed: false, hasGoalSummary: false }), 'chip-pending')
})
test('done while still on cover -> cover (min-show window keeps the calm screen; no instant flip to sheet)', () => {
  assert.equal(deriveAiSurface({ aiStatus: 'done', genPhase: 'cover', revealDismissed: false, hasGoalSummary: true }), 'cover')
})
test('error -> chip-error (any phase)', () => {
  assert.equal(deriveAiSurface({ aiStatus: 'error', genPhase: 'cover', revealDismissed: false, hasGoalSummary: false }), 'chip-error')
  assert.equal(deriveAiSurface({ aiStatus: 'error', genPhase: 'background', revealDismissed: false, hasGoalSummary: false }), 'chip-error')
})
test('done + goalSummary + not dismissed -> sheet', () => {
  assert.equal(deriveAiSurface({ aiStatus: 'done', genPhase: 'background', revealDismissed: false, hasGoalSummary: true }), 'sheet')
})
test('done + goalSummary + dismissed -> none', () => {
  assert.equal(deriveAiSurface({ aiStatus: 'done', genPhase: 'background', revealDismissed: true, hasGoalSummary: true }), 'none')
})
test('done without goalSummary -> none (default-plan completion, no sheet)', () => {
  assert.equal(deriveAiSurface({ aiStatus: 'done', genPhase: 'background', revealDismissed: false, hasGoalSummary: false }), 'none')
})

test('rehydrate: null row -> none', () => {
  assert.equal(deriveRehydrateAction(null), 'none')
})
test('rehydrate: done with result -> apply', () => {
  assert.equal(deriveRehydrateAction({ status: 'done', result: { planMeta: {} } }), 'apply')
})
test('rehydrate: done without result -> none', () => {
  assert.equal(deriveRehydrateAction({ status: 'done', result: null }), 'none')
})
test('rehydrate: pending -> resume', () => {
  assert.equal(deriveRehydrateAction({ status: 'pending', result: null }), 'resume')
})
test('rehydrate: error -> none (do not surface a stale error on mount)', () => {
  assert.equal(deriveRehydrateAction({ status: 'error', result: null }), 'none')
})
