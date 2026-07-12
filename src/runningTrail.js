// Pure, presentation-free logic for the "Ascent Trail" running screen.
// Kept in its own module so it can be unit-tested without a DOM. RunningPlanView.jsx is
// the only consumer.

export const DAYS = [
  ['mon', '월'], ['tue', '화'], ['wed', '수'], ['thu', '목'],
  ['fri', '금'], ['sat', '토'], ['sun', '일'],
]

// Date.getDay() (0=Sun) -> our day key.
const KEY_BY_JS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function todayKey(date = new Date()) {
  return KEY_BY_JS[date.getDay()]
}

// Coarse session classification, driven by resourceRef prefix then category.
export function sessionKind(quest) {
  const ref = quest?.resourceRef || ''
  if (ref.startsWith('run:')) return 'run'
  if (ref.startsWith('strength:')) return 'strength'
  if (quest?.category === 'reading') return 'review'
  return 'other'
}

export const isWorkout = (quest) => quest?.category === 'workout'

// A plan is "running" only when it actually contains run sessions. Drives whether the
// running-specific chrome (trail framing, gate) is shown, so we never assert a running
// journey on a plan that has none.
export function isRunningPlan(quests = []) {
  return quests.some((q) => sessionKind(q) === 'run')
}

// Extract a WALK duration and a RUN duration from an interval-run description. Returns
// null when the text is NOT a walk/run interval (continuous run, strength, prose without
// both durations) so the caller falls back to a plain card instead of fabricating numbers.
// We intentionally do NOT invent a rep count ("x6") — it is not present in source data.
//
// Callers pass the per-session `objective.ko` FIRST (what the card also displays), so the
// headline always matches the shown description; `unitLabel` is only a fallback. A generic
// catalog unitLabel shared across sessions must never override the specific objective.
export function parseWalkRun(text) {
  if (typeof text !== 'string' || !text) return null

  const dur = (n, unit) => ({ n: Number(n), unit })

  // Preferred: the true interval clause "<run> 달리기 <sep> <walk> 걷기"
  // (unitLabel uses "/", objective uses "·"). Pairs the interval run with the interval walk.
  const interval = text.match(
    /(\d+)\s*(분|초)\s*달리기\s*[·/]\s*(\d+)\s*(분|초)\s*걷기/,
  )
  if (interval) {
    return { run: dur(interval[1], interval[2]), walk: dur(interval[3], interval[4]) }
  }

  // Fallback: a standalone walk duration AND a standalone run duration anywhere
  // (handles "90초 달리기 후 2분 걷기를 반복" where the separator is a word, not · or /).
  const walk = text.match(/(\d+)\s*(분|초)\s*걷기/)
  const run = text.match(/(\d+)\s*(분|초)\s*달리기/)
  if (walk && run) {
    return { run: dur(run[1], run[2]), walk: dur(walk[1], walk[2]) }
  }
  return null
}

// Weekly Life-Game numbers, computed ONLY from real fixture rewards + local done map.
// No persisted level/streak is fabricated.
export function weeklySummary(quests = [], doneMap = {}) {
  let xpEarned = 0
  let xpTotal = 0
  let vitalityDelta = 0

  for (const q of quests) {
    const xp = q?.meta?.xp ?? 0
    xpTotal += xp
    if (doneMap[q.id]) {
      xpEarned += xp
      vitalityDelta += q?.meta?.statRewards?.vitality ?? 0
    }
  }
  return { xpEarned, xpTotal, vitalityDelta }
}

// Build the week trail: one entry per day (mon..sun). Session days are trail stops, rest
// days are camp dots. A day is "done" only when every quest on it is toggled done.
export function buildWeekTrail({ weekSchedule = {}, quests = [], today, doneMap = {} }) {
  const byId = Object.fromEntries(quests.map((q) => [q.id, q]))

  const nodes = DAYS.map(([dayKey, dayKo]) => {
    const sessions = (weekSchedule[dayKey] ?? []).map((id) => byId[id]).filter(Boolean)
    const kind = sessions.length === 0 ? 'rest' : 'session'
    const isDone = sessions.length > 0 && sessions.every((q) => doneMap[q.id])
    return { dayKey, dayKo, kind, sessions, isToday: dayKey === today, isDone }
  })

  return { nodes }
}

// Single weekly-progress source, derived from the SAME trail nodes the user sees.
// Kills the "different denominators" bug: header count + trail stops agree by construction.
export function weekProgress(nodes = []) {
  const sessions = nodes.filter((n) => n.kind === 'session')
  return { done: sessions.filter((n) => n.isDone).length, total: sessions.length }
}

// Deterministic S-curve layout: n points spread across the width, y following a gentle
// sine so the trail winds. Nodes and the connecting path sample the SAME points, so they
// always align. Returns {x,y} in the given viewBox units.
export function trailPoints(n, { width = 300, height = 168, padX = 24, amp = 44 } = {}) {
  if (n <= 0) return []
  const midY = height / 2
  const span = width - padX * 2
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1)
    return {
      x: padX + t * span,
      y: midY - amp * Math.sin(t * Math.PI * 1.5),
    }
  })
}

// Smooth path through points via Catmull-Rom -> cubic Bezier. Empty/1-point safe.
export function smoothPath(points) {
  if (!points || points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`
  }
  return d
}
