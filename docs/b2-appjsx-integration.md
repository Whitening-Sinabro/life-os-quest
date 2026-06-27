# B-2 — App.jsx Integration (manual apply)

The AI-personalization overlay wiring for `src/App.jsx`. **Apply these hunks by hand** — `App.jsx`
is a `.jsx` file blocked from automated edits by the `design-contract-preflight` hook. Everything
else in this feature (`src/aiPlan.js`, `src/supabase.js`, `tests/aiPlan.test.js`) is already
committed on branch `b2-react-overlay`.

Work **top to bottom** and re-locate each anchor by its surrounding code — line numbers shift as
earlier hunks add lines. Each hunk gives the exact text to FIND and what to do with it.

After applying all seven hunks: `npm run build` must pass, then commit `src/App.jsx`.

---

## Hunk A — imports (top of file, lines 2–3)

**FIND:**
```js
import { fetchUserState, upsertUserState, getSession, onAuthChange, signOut } from './supabase.js'
import Onboarding, { GOAL_OPTIONS } from './Onboarding.jsx'
```
**REPLACE WITH:**
```js
import { fetchUserState, upsertUserState, getSession, onAuthChange, signOut, requestAiPlan, fetchAiPlan } from './supabase.js'
import Onboarding, { GOAL_OPTIONS } from './Onboarding.jsx'
import { mapProfileToRequest, isPersonalizable, buildAiOverlay, aiSlotFor } from './aiPlan.js'
```

---

## Hunk B — `createDefaultState` (≈ line 651)

**FIND:**
```js
    onboarded: false,
    profile: null,
  }
}
```
**REPLACE WITH:**
```js
    onboarded: false,
    profile: null,
    aiPlan: null,
  }
}
```

---

## Hunk C — component state (right after `const [state, setState] = useState(createDefaultState)`, ≈ line 1133)

**FIND:**
```js
  const [state, setState] = useState(createDefaultState)
```
**REPLACE WITH:**
```js
  const [state, setState] = useState(createDefaultState)
  const [aiStatus, setAiStatus] = useState('idle') // 'idle' | 'pending' | 'error' | 'done'
  const [aiError, setAiError] = useState(null)
```

---

## Hunk D — enqueue/retry callbacks + poll effect

**Placement is load-bearing.** Insert immediately **after** the `updateState` definition
(≈ line 1378) and before `const toggleMission` (≈ line 1380). `updateState` is a `const`, so
referencing it any earlier throws a temporal-dead-zone `ReferenceError`. This spot is still above
the `if (!session)` early return (≈ line 1524), so these hooks stay unconditional and ordered.

**FIND:**
```js
  const updateState = (patch) => setState((current) => ({ ...current, ...patch }))

  const toggleMission = (missionId) => {
```
**REPLACE WITH:**
```js
  const updateState = (patch) => setState((current) => ({ ...current, ...patch }))

  // --- B-2: AI personalization (Supabase ai_plans queue, poll-based) ---
  const enqueueAiPlan = useCallback(
    (profile) => {
      if (!supabase || !currentUserId || !isPersonalizable(profile)) return
      setAiError(null)
      requestAiPlan(currentUserId, mapProfileToRequest(profile))
        .then(() => setAiStatus('pending')) // set pending only after the row is written (race-free)
        .catch(() => {
          setAiStatus('error')
          setAiError('enqueue_failed')
        })
    },
    [currentUserId],
  )

  const handleOnboardingComplete = useCallback(
    (profile) => {
      updateState({ profile, onboarded: true }) // non-blocking: enter the dashboard immediately
      enqueueAiPlan(profile)
    },
    [updateState, enqueueAiPlan],
  )

  useEffect(() => {
    if (aiStatus !== 'pending' || !currentUserId) return
    let cancelled = false
    let timer
    const deadline = Date.now() + 180000 // worker model timeout is 120s + poll slack
    const version = state.selectedVersion
    const poll = async () => {
      try {
        const row = await fetchAiPlan(currentUserId)
        if (cancelled) return
        if (!row || row.status === 'pending') {
          if (Date.now() > deadline) {
            setAiStatus('error')
            setAiError('timeout')
            return
          }
          timer = setTimeout(poll, 2500)
          return
        }
        if (row.status === 'error') {
          setAiStatus('error')
          setAiError(row.error ?? 'worker_error')
          return
        }
        // status === 'done'
        const overlay = buildAiOverlay(row.result, version, 1, getDefaultWeekSchedule(version, 1))
        if (overlay) {
          if (overlay.dropped.reading || overlay.dropped.workout) {
            // No silent cap; value-free payload, repo logging convention (console).
            console.warn('[aiPlan] dropped quests beyond slot capacity', overlay.dropped)
          }
          updateState({ aiPlan: overlay })
        }
        setAiStatus('done')
      } catch {
        if (!cancelled) {
          setAiStatus('error')
          setAiError('fetch_failed')
        }
      }
    }
    poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiStatus, currentUserId])

  const toggleMission = (missionId) => {
```

---

## Hunk E — onboarding call site (≈ line 1544)

**FIND:**
```jsx
        onComplete={(profile) => updateState({ profile, onboarded: true })}
```
**REPLACE WITH:**
```jsx
        onComplete={(profile) => handleOnboardingComplete(profile)}
```

---

## Hunk F — status banner (insert between the `DaySelector` `/>` ≈ line 1823 and the `{selectedDay.rest ? (` ≈ line 1825)

**FIND** (the `DaySelector` closing tag immediately followed by the rest-day ternary):
```jsx
                  onDropMission={moveMissionToDay}
                />

                {selectedDay.rest ? (
```
**REPLACE WITH:**
```jsx
                  onDropMission={moveMissionToDay}
                />

                {aiStatus !== 'idle' && (
                  <div
                    className={`mt-5 rounded-lg border p-4 text-sm ${
                      aiStatus === 'pending'
                        ? 'border-slate-200 bg-slate-50 text-slate-600'
                        : aiStatus === 'error'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {aiStatus === 'pending' && 'AI가 너의 목표에 맞춰 플랜을 다듬는 중… 기본 플랜으로 먼저 시작했어요.'}
                    {aiStatus === 'error' && (
                      <span className="inline-flex flex-wrap items-center gap-3">
                        개인화에 실패했어요. 기본 플랜으로 진행합니다.
                        <button
                          type="button"
                          onClick={() => enqueueAiPlan(state.profile)}
                          className="rounded-full border border-rose-300 px-3 py-1 font-black"
                        >
                          재시도
                        </button>
                      </span>
                    )}
                    {aiStatus === 'done' &&
                      (state.aiPlan?.goalSummary
                        ? `개인화 완료: ${tr(state.aiPlan.goalSummary, lang)}`
                        : '지금은 기본 플랜으로 진행해요.')}
                  </div>
                )}

                {selectedDay.rest ? (
```

---

## Hunk G — overlay the day-mission card (two edits inside the `dayMissions.map(...)` block)

**G-1 — add the slot lookup after `const Icon = mission.icon` (≈ line 1841).**

**FIND:**
```jsx
                      const Icon = mission.icon
                      return (
```
**REPLACE WITH:**
```jsx
                      const Icon = mission.icon
                      const overlay = aiSlotFor(state.aiPlan, state.selectedVersion, state.selectedWeek, selectedDay.id, mission.id)
                      return (
```

**G-2 — swap the description and add a resource line (≈ line 1862).**

**FIND:**
```jsx
                          <p className="mt-3 min-h-10 text-sm leading-5 text-slate-500">{tr(mission.detail, lang)}</p>
```
**REPLACE WITH:**
```jsx
                          <p className="mt-3 min-h-10 text-sm leading-5 text-slate-500">
                            {overlay ? tr({ ko: overlay.objectiveKo, en: overlay.objectiveEn }, lang) : tr(mission.detail, lang)}
                          </p>
                          {overlay?.title && (
                            <p className="mt-2 text-xs font-semibold text-slate-400">
                              {overlay.title}
                              {overlay.unitLabel ? ` · ${overlay.unitLabel}` : ''}
                            </p>
                          )}
```

---

## After applying

1. **Build:** from `D:\life-os\life-os-quest`, run `npm install` (first time only) then `npm run build`.
   It must complete with no errors. Fix any JSX/scope errors (usually a mis-located anchor) before committing.
2. **Commit:**
   ```bash
   git add src/App.jsx
   git commit -m "feat(b2): wire AI overlay into App.jsx (imports, state, poll, render)"
   ```

## Notes / invariants

- `currentUserId` (`= session?.user?.id ?? null`) is already the authenticated uid; the whole app
  is gated behind `if (!session)` (Auth screen), so onboarding only runs for authed users.
  `enqueueAiPlan` no-ops without a client/session/complete profile — guests are untouched.
- The overlay only changes a slot's **description text** (and adds a resource line); icon, XP, stats,
  and title come from the app mission (the app owns the game structure). No schedule, mission roster,
  or progress/level code is touched.
- Banner styling is plain bordered cards (slate/rose/emerald) — no gradient/glow/blur (design-guard).
- The poll uses the version selected at enqueue time (onboarding default); week 1 only.
