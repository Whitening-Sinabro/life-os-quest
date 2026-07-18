import { test } from 'node:test'
import assert from 'node:assert/strict'
import { copy, tr } from '../src/i18n.js'

// Call sites render `c.key ?? copy.en.key`, so any key present in `copy.en`
// but absent from `copy.ko` silently shows English to a Korean user. This is
// the invariant whose violation put an English dashboard in front of new users.
test('copy.ko is a complete mirror of copy.en (every en key has a ko translation)', () => {
  const missing = Object.keys(copy.en).filter((key) => !(key in copy.ko))
  assert.deepEqual(missing, [], `copy.ko is missing keys: ${missing.join(', ')}`)
})

test('copy.en and copy.ko have exactly the same key set (no orphan ko keys either)', () => {
  assert.deepEqual(Object.keys(copy.en).sort(), Object.keys(copy.ko).sort())
})

test('every string-valued ko entry is actually translated, not left in English', () => {
  // A ko string byte-identical to its en counterpart is an untranslated leak that
  // renders English to a Korean user (directly, not via the copy.en fallback).
  // No allowlist: the app already localizes its would-be "brand" words (questBadge
  // uses 퀘스트, progressTitle uses 진행률), so any en==ko string is a real leak.
  const leaked = Object.keys(copy.en).filter((key) => {
    const en = copy.en[key]
    const ko = copy.ko[key]
    return typeof en === 'string' && typeof ko === 'string' && en === ko
  })
  assert.deepEqual(leaked, [], `ko entries left in English: ${leaked.join(', ')}`)
})

test('tr resolves by language and falls back to en for unknown languages', () => {
  assert.equal(tr({ ko: '안녕', en: 'hi' }, 'ko'), '안녕')
  assert.equal(tr({ ko: '안녕', en: 'hi' }, 'en'), 'hi')
  assert.equal(tr({ ko: '안녕', en: 'hi' }, 'fr'), 'hi')
  assert.equal(tr('plain', 'ko'), 'plain')
  assert.equal(tr(undefined, 'ko'), '')
})
