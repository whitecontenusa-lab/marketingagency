import { STEP_NAMES } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// step 1 = Welcome (no label shown), steps 2–6 map to STEP_NAMES[0–4]
export function ProgressBar({ step, total, lang = 'es' }: { step: number; total: number; lang?: Lang }) {
  const names = STEP_NAMES[lang]
  // Steps 2–6 are the named steps (5 total)
  const namedSteps = total - 1
  const currentNamed = step - 1 // 0-indexed relative to named steps

  if (step <= 1) return null // Welcome screen has no progress bar

  return (
    <div className="mb-10">
      {/* Step label */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {names[currentNamed - 1] ?? ''}
        </span>
        <span className="text-xs text-zinc-400">{currentNamed} / {namedSteps}</span>
      </div>
      {/* Segmented bar */}
      <div className="flex gap-1.5">
        {Array.from({ length: namedSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i < currentNamed ? 'bg-zinc-900' : 'bg-zinc-200'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
