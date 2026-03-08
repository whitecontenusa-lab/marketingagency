'use client'
import { useState } from 'react'
import { ProgressBar } from './ProgressBar'
import { getText } from '@/lib/i18n'
import type { StepProps } from './types'

export function StepVision({ lang, session, saving, onNext, onBack, step, total }: StepProps) {
  const [vision3Years, setVision3Years] = useState(session.vision3Years ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext({ vision3Years })
  }

  return (
    <div>
      <ProgressBar step={step} total={total} lang={lang} />
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">{getText(lang, 'step6Title')}</h1>
      <p className="text-sm text-zinc-500 mb-6">{getText(lang, 'step6Subtitle')}</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">{getText(lang, 'vision')}</label>
          <p className="text-xs text-zinc-400 mb-2">{getText(lang, 'visionHint')}</p>
          <textarea
            value={vision3Years}
            onChange={e => setVision3Years(e.target.value)}
            rows={6}
            required
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            disabled={saving}
            className="flex-1 border border-zinc-200 text-zinc-700 px-6 py-3 rounded-xl font-medium hover:bg-zinc-50 transition disabled:opacity-50"
          >
            {getText(lang, 'back')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-zinc-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-zinc-700 transition disabled:opacity-50"
          >
            {saving ? getText(lang, 'saving') : getText(lang, 'next')}
          </button>
        </div>
      </form>
    </div>
  )
}
