import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LANG, resolveLang } from '../src/lang.js'

// The app ships a single real locale: onboarding and all chrome are Korean-only,
// with no English onboarding path. A new user must never land on an English
// dashboard/reveal sheet — English is opt-in via the in-app settings toggle.
test('DEFAULT_LANG is Korean (KO-only onboarding — new users must not see English)', () => {
  assert.equal(DEFAULT_LANG, 'ko')
})

test('resolveLang uses the stored language when the user has chosen one', () => {
  assert.equal(resolveLang({ lang: 'en' }), 'en')
  assert.equal(resolveLang({ lang: 'ko' }), 'ko')
})

test('resolveLang falls back to the default for missing/null lang (legacy/partial state)', () => {
  assert.equal(resolveLang({}), 'ko')
  assert.equal(resolveLang({ lang: null }), 'ko')
  assert.equal(resolveLang({ lang: undefined }), 'ko')
  assert.equal(resolveLang(undefined), 'ko')
  assert.equal(resolveLang(null), 'ko')
})
