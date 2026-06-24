import { useState } from 'react'
import { ArrowRight, ArrowLeft, Sparkles, Check } from 'lucide-react'

const GOAL_OPTIONS = [
  { id: 'health', label: '건강한 습관 만들기', desc: '운동·수면·식습관을 꾸준히' },
  { id: 'selfdev', label: '자기계발', desc: '새로운 지식과 기술 익히기' },
  { id: 'career', label: '커리어 성장', desc: '일과 전문성을 한 단계 위로' },
  { id: 'mindset', label: '마음 챙김', desc: '감정과 에너지를 안정적으로' },
  { id: 'custom', label: '사용자 정의', desc: '나만의 목표를 직접 정하기' },
]

const STATE_FIELDS = [
  { id: 'fitness', label: '체력', options: ['낮음', '보통', '높음'] },
  { id: 'age', label: '나이', options: ['10대', '20대', '30대', '40대', '50대 이상'] },
  { id: 'job', label: '직업', options: ['학생', '직장인', '프리랜서', '자영업', '기타'] },
]

const PATTERN_FIELDS = [
  { id: 'sleep', label: '수면 시간', options: ['5시간 이하', '6시간', '7시간', '8시간', '9시간 이상'] },
  { id: 'activity', label: '선호 활동', options: ['영상', '독서', '운동', '대화', '창작'] },
  { id: 'freeTime', label: '투자 가능 시간', options: ['30분 이하', '30분-1시간', '1-2시간', '2시간 이상'] },
  { id: 'focusTime', label: '집중 시간대', options: ['아침', '오후', '저녁', '밤'] },
]

const DURATION_OPTIONS = ['1주', '2주', '3주', '4주', '2개월', '3개월', '4개월', '5개월', '6개월']

const TOTAL_STEPS = 6 // welcome + goals, dream, state, pattern, duration

function ProgressDots({ step }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === step ? 'w-6 bg-indigo-500' : i < step ? 'w-1.5 bg-indigo-300' : 'w-1.5 bg-slate-200'
          }`}
        />
      ))}
    </div>
  )
}

function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 text-sm font-black text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
    >
      {children}
    </button>
  )
}

function Welcome({ onNext }) {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-200">
          <Sparkles size={30} />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Life Game</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
            AI가 당신을 이해하고
            <br />
            성장의 길을 함께 설계합니다.
          </p>
        </div>
      </div>
      <div className="w-full">
        <PrimaryButton onClick={onNext}>
          시작하기 <ArrowRight size={16} />
        </PrimaryButton>
      </div>
    </div>
  )
}

function GoalStep({ value, onChange, onNext }) {
  const toggle = (id) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }
  return (
    <div className="flex min-h-[80vh] flex-col">
      <div className="flex-1">
        <h2 className="text-xl font-black text-slate-950">당신의 목표는 무엇인가요?</h2>
        <p className="mt-1 text-sm text-slate-500">하나 이상 선택해 주세요.</p>
        <div className="mt-6 grid gap-2.5">
          {GOAL_OPTIONS.map((opt) => {
            const active = value.includes(opt.id)
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggle(opt.id)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                  active ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${
                    active ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {active && <Check size={14} strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-900">{opt.label}</span>
                  <span className="block text-xs text-slate-500">{opt.desc}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="sticky bottom-0 mt-6 bg-gradient-to-t from-[#f7f8fb] via-[#f7f8fb] to-transparent pb-2 pt-3">
        <PrimaryButton onClick={onNext} disabled={value.length === 0}>
          다음 <ArrowRight size={16} />
        </PrimaryButton>
      </div>
    </div>
  )
}

function StepLayout({ title, subtitle, children, onNext, nextDisabled, nextLabel = '다음', lastStep }) {
  return (
    <div className="flex min-h-[80vh] flex-col">
      <div className="flex-1">
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      <div className="sticky bottom-0 mt-6 bg-gradient-to-t from-[#f7f8fb] via-[#f7f8fb] to-transparent pb-2 pt-3">
        <PrimaryButton onClick={onNext} disabled={nextDisabled}>
          {lastStep ? nextLabel : <>다음 <ArrowRight size={16} /></>}
        </PrimaryButton>
      </div>
    </div>
  )
}

function DreamStep({ value, onChange, onNext }) {
  return (
    <StepLayout title="당신의 꿈은 무엇인가요?" subtitle="자유롭게 적어 주세요." onNext={onNext} nextDisabled={!value?.trim()}>
      <div className="relative">
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value.slice(0, 240))}
          rows={5}
          placeholder="예) 매일 조금씩 성장해서 내 분야의 전문가가 되고 싶어요."
          className="w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500"
        />
        <span className="absolute bottom-3 right-3 text-xs text-slate-400">{(value ?? '').length}/240</span>
      </div>
    </StepLayout>
  )
}

function SelectField({ label, options, value, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-black text-slate-700">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={`h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-indigo-500 ${
          value ? 'text-slate-900' : 'text-slate-400'
        }`}
      >
        <option value="" disabled>
          선택해 주세요
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt} className="text-slate-900">
            {opt}
          </option>
        ))}
      </select>
    </div>
  )
}

function SelectFieldsStep({ title, subtitle, fields, values, onChange, onNext, lastStep, nextLabel }) {
  const allFilled = fields.every((f) => values?.[f.id])
  return (
    <StepLayout title={title} subtitle={subtitle} onNext={onNext} nextDisabled={!allFilled} lastStep={lastStep} nextLabel={nextLabel}>
      <div className="grid gap-4">
        {fields.map((f) => (
          <SelectField
            key={f.id}
            label={f.label}
            options={f.options}
            value={values?.[f.id]}
            onChange={(v) => onChange({ ...values, [f.id]: v })}
          />
        ))}
      </div>
    </StepLayout>
  )
}

function DurationStep({ value, onChange, onNext }) {
  return (
    <StepLayout
      title="얼마 동안의 플랜을 짜드릴까요?"
      subtitle="기간에 맞춰 성장 계획을 설계해요."
      onNext={onNext}
      nextDisabled={!value}
      lastStep
      nextLabel="플랜 만들기"
    >
      <SelectField label="플랜 기간" options={DURATION_OPTIONS} value={value} onChange={onChange} />
    </StepLayout>
  )
}

const GOAL_LABELS = Object.fromEntries(GOAL_OPTIONS.map((o) => [o.id, o.label]))

function SummaryPopup({ profile, onConfirm }) {
  const goals = (profile.goals ?? []).map((id) => GOAL_LABELS[id] ?? id)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-5">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-indigo-500 text-white">
          <Sparkles size={24} />
        </div>
        <h2 className="text-center text-lg font-black leading-7 text-slate-950">
          당신을 위한
          <br />
          <span className="text-indigo-600">{profile.duration ?? ''}</span>간의 플랜이 완성됐어요!
        </h2>
        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">내 목표</p>
          {goals.length ? (
            <ul className="grid gap-1.5">
              {goals.map((g) => (
                <li key={g} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Check size={15} className="shrink-0 text-indigo-500" strokeWidth={3} />
                  {g}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">목표를 선택하지 않았어요.</p>
          )}
        </div>
        <div className="mt-6">
          <PrimaryButton onClick={onConfirm}>
            시작하기 <ArrowRight size={16} />
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

export default function Onboarding({ initialProfile, onProfileChange, onComplete }) {
  const [profile, setProfile] = useState(() => ({ goals: [], _step: 0, ...initialProfile }))
  const [showSummary, setShowSummary] = useState(false)
  const step = Math.min(TOTAL_STEPS - 1, profile._step ?? 0)

  // Persist every change (incl. current step) so progress survives reload / resumes per account.
  const commit = (nextProfile) => {
    setProfile(nextProfile)
    onProfileChange?.(nextProfile)
  }
  const patch = (changes) => commit({ ...profile, ...changes })
  const next = () => commit({ ...profile, _step: Math.min(TOTAL_STEPS - 1, step + 1) })
  const back = () => commit({ ...profile, _step: Math.max(0, step - 1) })
  const finish = () => onComplete({ ...profile, _step: TOTAL_STEPS - 1 })

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-6 pt-5">
        {step > 0 && (
          <div className="mb-6 grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
            <button
              type="button"
              onClick={back}
              aria-label="뒤로"
              className="grid h-10 w-10 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <ArrowLeft size={20} />
            </button>
            <ProgressDots step={step} />
            <span />
          </div>
        )}
        {step === 0 && <Welcome onNext={next} />}
        {step === 1 && <GoalStep value={profile.goals} onChange={(goals) => patch({ goals })} onNext={next} />}
        {step === 2 && <DreamStep value={profile.dream} onChange={(dream) => patch({ dream })} onNext={next} />}
        {step === 3 && (
          <SelectFieldsStep
            title="현재 내 상태는 어떤가요?"
            subtitle="지금의 나를 알려 주세요."
            fields={STATE_FIELDS}
            values={profile.currentState}
            onChange={(currentState) => patch({ currentState })}
            onNext={next}
          />
        )}
        {step === 4 && (
          <SelectFieldsStep
            title="당신의 생활 패턴은 어떤가요?"
            subtitle="일상을 알려 주면 더 잘 맞춰 드려요."
            fields={PATTERN_FIELDS}
            values={profile.pattern}
            onChange={(pattern) => patch({ pattern })}
            onNext={next}
          />
        )}
        {step === 5 && (
          <DurationStep
            value={profile.duration}
            onChange={(duration) => patch({ duration })}
            onNext={() => setShowSummary(true)}
          />
        )}
      </div>
      {showSummary && <SummaryPopup profile={profile} onConfirm={finish} />}
    </main>
  )
}
