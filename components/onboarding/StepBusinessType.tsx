'use client'
import { useState } from 'react'
import { ProgressBar } from './ProgressBar'
import { getText } from '@/lib/i18n'
import type { StepProps } from './types'

type BusinessType = 'physical_product' | 'service' | 'digital_product' | 'personal_brand'

const BUSINESS_TYPES: { type: BusinessType; icon: string; labelKey: string; descKey: string }[] = [
  { type: 'physical_product', icon: '📦', labelKey: 'btPhysical',  descKey: 'btPhysicalDesc'  },
  { type: 'service',          icon: '🤝', labelKey: 'btService',   descKey: 'btServiceDesc'   },
  { type: 'digital_product',  icon: '💻', labelKey: 'btDigital',   descKey: 'btDigitalDesc'   },
  { type: 'personal_brand',   icon: '⭐', labelKey: 'btPersonal',  descKey: 'btPersonalDesc'  },
]

export function StepBusinessType({ lang, session, saving, onNext, onBack, step, total }: StepProps) {
  const [selected, setSelected] = useState<BusinessType | ''>(
    (session.businessType as BusinessType | null) ?? ''
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    onNext({ businessType: selected })
  }

  return (
    <div>
      <ProgressBar step={step} total={total} lang={lang} />
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">{getText(lang, 'btStepTitle')}</h1>
      <p className="text-sm text-zinc-500 mb-6">{getText(lang, 'btStepSubtitle')}</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          {BUSINESS_TYPES.map(({ type, icon, labelKey, descKey }) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelected(type)}
              className={`flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition ${
                selected === type
                  ? 'border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900'
                  : 'border-zinc-200 hover:border-zinc-400 bg-white'
              }`}
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-sm font-semibold text-zinc-900">{getText(lang, labelKey)}</span>
              <span className="text-xs text-zinc-500 leading-snug">{getText(lang, descKey)}</span>
            </button>
          ))}
        </div>
        {/* Hidden required input to enforce selection before submit */}
        <input type="hidden" value={selected} required />
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
            disabled={saving || !selected}
            className="flex-1 bg-zinc-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-zinc-700 transition disabled:opacity-50"
          >
            {saving ? getText(lang, 'saving') : getText(lang, 'next')}
          </button>
        </div>
      </form>
    </div>
  )
}
