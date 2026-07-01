// src/ai/AiGenerationOverlay.jsx
// D2 — calm, honest generation cover. No progress claim (worker gives only pending/done/error).
import { motion } from 'framer-motion'

export default function AiGenerationOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="mb-5 h-14 w-14 animate-spin rounded-full border-4 border-surface-3 border-t-accent" />
      <p className="text-lg font-black text-fg">너의 플랜을 짜는 중</p>
      <p className="mt-2 max-w-xs text-sm leading-6 text-muted">
        목표와 러닝 수준에 맞춰 이번 주를 다듬고 있어요
      </p>
      <p className="mt-6 text-xs text-faint">보통 10초 이내</p>
    </motion.div>
  )
}
