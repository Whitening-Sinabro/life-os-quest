// "Ascent Trail" running screen (concept ① — chosen 2026-07-04, fixed 2026-07-05).
// A single winding trail = the week's road to the goal: session days are stops, rest days
// are camp dots, a boss gate sits at the far end. The today-card renders interval runs as
// WALK/RUN typography (effort read by ink-weight: 걷기 = hollow outline, 달리기 = solid
// indigo) on ONE line, and falls back to a plain card on non-interval days.
// LIGHT + one INDIGO accent (matches Onboarding). Standard Tailwind slate+indigo utilities
// only; SVG colored via fill-/stroke- utilities + currentColor -> no raw hex, no gradient,
// no glow (design-guard clean). Life-Game numbers are weekly and REAL (computed from
// fixture rewards + local done map); no persisted level/streak is fabricated, and the
// running framing is shown only when the plan actually contains run sessions.
// Mounted by main.jsx on ?demo=<fixture>.
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Dumbbell, BookOpen, Moon } from 'lucide-react'
import {
  DAYS,
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
} from './runningTrail'

const dayKo = (key) => DAYS.find(([k]) => k === key)?.[1] ?? ''

// ---- today card variants -------------------------------------------------------------

function CardShell({ dayKey, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-900/5">
      <p className="text-[11px] font-extrabold tracking-wide text-indigo-500">
        오늘의 퀘스트 · {dayKo(dayKey)}요일
      </p>
      {children}
    </div>
  )
}

function Reward({ reward }) {
  if (!reward) return null
  return (
    <p className="mt-3 inline-block rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-extrabold text-indigo-600">
      {reward}
    </p>
  )
}

function StartButton({ done, onStart }) {
  return (
    <button
      type="button"
      onClick={onStart}
      className={`mt-3 w-full rounded-xl py-3 text-center text-sm font-extrabold transition ${
        done ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500 text-white hover:bg-indigo-600'
      }`}
    >
      {done ? '완료됨 ✓' : '퀘스트 시작 →'}
    </button>
  )
}

function WalkRunCard({ quest, dayKey, interval, reward, onStart, done }) {
  const mins = quest.estimatedMinutes ? `약 ${quest.estimatedMinutes}분` : ''
  return (
    <CardShell dayKey={dayKey}>
      <div className="mt-2 flex items-baseline gap-2 whitespace-nowrap leading-none">
        <span
          className="text-2xl font-black tracking-tight text-slate-900"
          style={{
            WebkitTextStrokeWidth: '2px',
            WebkitTextStrokeColor: 'currentColor',
            WebkitTextFillColor: 'transparent',
          }}
        >
          걷기 {interval.walk.n}{interval.walk.unit}
        </span>
        <span className="text-3xl font-black tracking-tight text-indigo-500">
          달리기 {interval.run.n}{interval.run.unit}
        </span>
      </div>
      {quest.objective?.ko && (
        <p className="mt-3 text-sm leading-6 text-slate-500">{quest.objective.ko}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
          🏃 러닝
        </span>
        {mins && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
            {mins}
          </span>
        )}
      </div>
      <Reward reward={reward} />
      <StartButton done={done} onStart={onStart} />
    </CardShell>
  )
}

function FallbackCard({ quest, dayKey, reward, onStart, done }) {
  const kind = sessionKind(quest)
  const Icon = kind === 'strength' ? Dumbbell : BookOpen
  const fallbackName = kind === 'strength' ? '근력 세션' : kind === 'review' ? '읽기·회고' : '오늘의 세션'
  const name = quest.title || fallbackName
  const mins = quest.estimatedMinutes ? `약 ${quest.estimatedMinutes}분` : ''
  return (
    <CardShell dayKey={dayKey}>
      <div className="mt-3 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-500">
          <Icon size={22} />
        </div>
        <div>
          <p className="text-lg font-extrabold leading-tight text-slate-900">{name}</p>
          {(mins || quest.subtitle) && (
            <p className="mt-0.5 text-sm font-semibold text-slate-500">
              {[mins, quest.subtitle].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>
      {quest.objective?.ko && (
        <p className="mt-3 text-sm leading-6 text-slate-500">{quest.objective.ko}</p>
      )}
      <Reward reward={reward} />
      <StartButton done={done} onStart={onStart} />
    </CardShell>
  )
}

function RestCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-900/5">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-400">
        <Moon size={22} />
      </div>
      <p className="mt-3 text-lg font-extrabold text-slate-900">오늘은 휴식일</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">회복도 트레일의 일부예요. 내일 이어서 걸어요.</p>
    </div>
  )
}

// ---- the trail ------------------------------------------------------------------------

const VIEW = { width: 300, height: 176, padX: 26, amp: 46 }

function hexPath(cx, cy, r) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`
  })
  return `M ${pts.join(' L ')} Z`
}

function Trail({ nodes, gateEmoji }) {
  // Points: [trailhead, ...7 day nodes, gate]. The trailhead gives the first day node a
  // real entry segment, so completing the very first session still inks a visible stretch.
  const pathPoints = trailPoints(nodes.length + 2, VIEW)
  const trailhead = pathPoints[0]
  const gate = pathPoints[pathPoints.length - 1]
  const fullPath = smoothPath(pathPoints)

  // Ink ONLY the entry segment of each completed session day — no continuous "you traveled
  // all this" claim, so a done Friday never paves over an undone Monday.
  const doneSegments = nodes
    .map((n, i) => (n.kind === 'session' && n.isDone ? i : -1))
    .filter((i) => i >= 0)
    .map((i) => ({ i, d: smoothPath([pathPoints[i], pathPoints[i + 1]]) }))

  return (
    <svg
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      className="w-full"
      style={{ height: 'auto' }}
      role="img"
      aria-label="이번 주 트레일"
    >
      {/* full trail — dashed indigo-200 (not yet travelled) */}
      <path
        d={fullPath}
        fill="none"
        strokeWidth="5"
        strokeDasharray="2 9"
        strokeLinecap="round"
        className="stroke-indigo-200"
      />
      {/* completed entry segments — solid indigo, ink forward on completion */}
      {doneSegments.map(({ i, d }) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          className="stroke-indigo-500"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
      ))}

      {/* trailhead marker */}
      <circle cx={trailhead.x} cy={trailhead.y} r="3.5" className="fill-slate-300" />

      {/* day nodes */}
      {nodes.map((n, i) => {
        const p = pathPoints[i + 1]
        if (n.kind === 'rest') {
          return <circle key={n.dayKey} cx={p.x} cy={p.y} r="3.5" className="fill-slate-300" />
        }
        if (n.isDone) {
          return (
            <g key={n.dayKey}>
              <circle cx={p.x} cy={p.y} r="9" className="fill-indigo-500" />
              <path
                d={`M ${p.x - 4} ${p.y} l 3 3 l 6 -6`}
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-white"
              />
            </g>
          )
        }
        if (n.isToday) {
          return (
            <g key={n.dayKey}>
              <circle cx={p.x} cy={p.y} r="12" strokeWidth="3" className="fill-white stroke-indigo-500" />
              <motion.text
                x={p.x}
                y={p.y + 5}
                textAnchor="middle"
                fontSize="14"
                animate={{ y: [p.y + 5, p.y + 1, p.y + 5] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                🏃
              </motion.text>
            </g>
          )
        }
        return (
          <circle
            key={n.dayKey}
            cx={p.x}
            cy={p.y}
            r="8"
            strokeWidth="2"
            className="fill-slate-100 stroke-slate-200"
          />
        )
      })}

      {/* boss gate — hexagon, locked */}
      <g>
        <path d={hexPath(gate.x, gate.y, 12)} strokeWidth="2.5" className="fill-indigo-50 stroke-indigo-300" />
        <text x={gate.x} y={gate.y + 5} textAnchor="middle" fontSize="13">{gateEmoji}</text>
      </g>
    </svg>
  )
}

// ---- screen ---------------------------------------------------------------------------

export default function RunningPlanView({ name }) {
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [done, setDone] = useState({})

  useEffect(() => {
    let cancelled = false
    fetch(`/previews/${name}.json`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`fixture ${name} not found`))))
      .then((d) => !cancelled && setResult(d))
      .catch((e) => !cancelled && setError(e.message))
    return () => { cancelled = true }
  }, [name])

  // DEV-only: ?day=<mon..sun> forces "today" so any weekday's card can be reviewed.
  const forcedDay = import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get('day')
    : null
  const today = DAYS.some(([k]) => k === forcedDay) ? forcedDay : todayKey()

  const quests = result?.quests ?? []
  const weekSchedule = result?.weekSchedule ?? {}

  const trail = useMemo(
    () => buildWeekTrail({ weekSchedule, quests, today, doneMap: done }),
    [weekSchedule, quests, today, done],
  )
  const summary = useMemo(() => weeklySummary(quests, done), [quests, done])

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 px-5 py-10">
        <p className="font-semibold text-slate-700">플랜을 불러오지 못했어요</p>
        <p className="mt-1 text-sm text-slate-400">{error}</p>
      </div>
    )
  }
  if (!result) {
    return <div className="min-h-screen bg-slate-50 px-5 py-10 text-slate-400">불러오는 중…</div>
  }

  const running = isRunningPlan(quests)
  const goal = result.planMeta?.goalSummary?.ko ?? ''
  const weeks = result.planMeta?.durationWeeks ?? null
  const progress = weekProgress(trail.nodes)

  const todayNode = trail.nodes.find((n) => n.dayKey === today)
  const todaySessions = todayNode?.sessions ?? []
  const primary =
    todaySessions.find((q) => sessionKind(q) === 'run') ??
    todaySessions.find(isWorkout) ??
    todaySessions[0] ??
    null

  // Parse the per-session objective FIRST (what the card also shows), unitLabel only as
  // fallback, so the WALK/RUN headline can never contradict the description below it.
  const interval = primary && sessionKind(primary) === 'run'
    ? parseWalkRun(primary.objective?.ko || primary.unitLabel)
    : null

  const reward = primary
    ? [
        primary.meta?.xp ? `+${primary.meta.xp} XP` : '',
        primary.meta?.statRewards?.vitality ? `체력 +${primary.meta.statRewards.vitality}` : '',
      ].filter(Boolean).join(' · ')
    : ''

  const startToday = () =>
    setDone((d) => {
      const next = { ...d }
      const anyUndone = todaySessions.some((q) => !next[q.id])
      todaySessions.forEach((q) => { next[q.id] = anyUndone })
      return next
    })
  const todayDone = todaySessions.length > 0 && todaySessions.every((q) => done[q.id])

  const xpPct = summary.xpTotal ? Math.round((summary.xpEarned / summary.xpTotal) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-md px-5 pb-16 pt-10">
        {/* header — journey identity + weekly-real Life Game numbers */}
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-indigo-500 px-2.5 py-1 text-xs font-black tracking-wide text-white">
            {running ? 'RUN' : '주간'}
          </span>
          <span className="text-sm font-extrabold text-slate-900">
            {running ? '러닝 여정' : '이번 주 플랜'}
          </span>
          {progress.total > 0 && (
            <span className="ml-auto rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600">
              이번 주 {progress.done}/{progress.total}
            </span>
          )}
        </div>
        {goal && <h1 className="mt-3 text-xl font-extrabold leading-tight text-slate-900">{goal}</h1>}
        {!running && (
          <p className="mt-2 text-xs font-semibold text-slate-400">
            러닝 세션이 없는 플랜이에요 — 이 화면은 러닝 전용이라 트레일만 표시돼요.
          </p>
        )}

        {/* weekly XP bar */}
        <div className="mt-3">
          <div className="h-[7px] overflow-hidden rounded-full bg-slate-200">
            <motion.div
              className="h-full rounded-full bg-indigo-500"
              initial={false}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10.5px] font-bold text-slate-400">
            <span>이번 주 {summary.xpEarned} / {summary.xpTotal} XP</span>
            <span>{weeks ? `${weeks}주 프로그램` : ''}</span>
          </div>
          {summary.vitalityDelta > 0 && (
            <span className="mt-2 inline-block rounded-full bg-indigo-50 px-2.5 py-1 text-[10.5px] font-extrabold text-indigo-600">
              체력 +{summary.vitalityDelta} 이번 주
            </span>
          )}
        </div>

        {/* today card */}
        <div className="mt-6">
          {!primary ? (
            <RestCard />
          ) : interval ? (
            <WalkRunCard quest={primary} dayKey={today} interval={interval} reward={reward} onStart={startToday} done={todayDone} />
          ) : (
            <FallbackCard quest={primary} dayKey={today} reward={reward} onStart={startToday} done={todayDone} />
          )}
        </div>

        {/* the trail */}
        <p className="mb-1 mt-7 text-[10.5px] font-extrabold uppercase tracking-widest text-slate-400">
          {running ? '이번 주 러닝 트레일' : '이번 주 트레일'}
        </p>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <Trail nodes={trail.nodes} gateEmoji={running ? '🏁' : '⛳'} />
        </div>

        {/* boss gate summary */}
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-indigo-50 px-3.5 py-3">
          <span className="text-lg">{running ? '🏁' : '⛳'}</span>
          <div>
            <p className="text-[11.5px] font-extrabold text-indigo-600">FINAL · 목표 완주</p>
            <p className="text-[10px] text-slate-500">{weeks ? `${weeks}주 여정 · 보스 게이트` : '보스 게이트'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
