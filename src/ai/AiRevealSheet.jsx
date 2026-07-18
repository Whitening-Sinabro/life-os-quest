// src/ai/AiRevealSheet.jsx
// D3 — bottom sheet reveal, reused for fast + slow path. Props are already-resolved strings.
import { motion } from 'framer-motion'

export default function AiRevealSheet({ goalSummary, summaryLines = [], onDismiss }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={onDismiss}
        className="absolute inset-0 bg-bg/60"
      />
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="relative w-full max-w-md rounded-t-2xl border-t-2 border-accent bg-surface p-5 pb-7"
        role="dialog"
        aria-modal="true"
        aria-label="맞춤 플랜 완료"
      >
        <p className="text-xs font-black tracking-wide text-accent">맞춤 완료</p>
        {goalSummary && <h3 className="mt-2 text-xl font-black leading-7 text-fg">{goalSummary}</h3>}
        {summaryLines.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {summaryLines.map((line, i) => (
              <li key={i} className="text-sm leading-6 text-muted">· {line}</li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 w-full rounded-xl bg-accent py-3 text-center font-black text-on-accent"
        >
          플랜 보기 →
        </button>
      </motion.div>
    </motion.div>
  )
}
