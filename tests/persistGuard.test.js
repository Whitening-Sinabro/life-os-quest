import test from 'node:test'
import assert from 'node:assert/strict'
import { canPersist } from '../src/persistGuard.js'

// Each case below is a failure mode an independent review found in the previous attempt, which
// caught `permission-denied` after the fact and swallowed it when auth.currentUser was null.

test('allows a signed-in user to write their own document', () => {
  assert.equal(canPersist('uid-a', 'uid-a'), true)
})

test('refuses when nobody is signed in', () => {
  // The debounced save can fire after sign-out. Refusing here means no request is issued at all,
  // so there is no server verdict to misread as benign.
  assert.equal(canPersist(null, 'uid-a'), false)
  assert.equal(canPersist(undefined, 'uid-a'), false)
  assert.equal(canPersist('', 'uid-a'), false)
})

test('refuses a write aimed at a DIFFERENT user (account switch)', () => {
  // A debounced write captured uid A; the user then signed in as B. The old predicate only
  // looked at "is anyone signed in", so this write still went out and was denied by the rules.
  assert.equal(canPersist('uid-b', 'uid-a'), false)
})

test('refuses when the target document is unknown', () => {
  assert.equal(canPersist('uid-a', null), false)
  assert.equal(canPersist('uid-a', undefined), false)
  assert.equal(canPersist('uid-a', ''), false)
})

test('refuses when both are missing rather than treating it as a match', () => {
  // Guards against an `a === b` shortcut that would let null === null through.
  assert.equal(canPersist(null, null), false)
  assert.equal(canPersist(undefined, undefined), false)
  assert.equal(canPersist('', ''), false)
})

test('is an exact comparison, not a prefix or loose one', () => {
  assert.equal(canPersist('uid-a', 'uid-ab'), false)
  assert.equal(canPersist('uid-ab', 'uid-a'), false)
})
