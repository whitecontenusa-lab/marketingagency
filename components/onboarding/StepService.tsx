'use client'
import { useState } from 'react'
import { ProgressBar } from './ProgressBar'
import { getText } from '@/lib/i18n'
import type { StepProps } from './types'

const STAGES = ['starting', 'selling', 'scaling'] as const

const REVENUE_MODELS = [
  { value: 'per_session',      labelEs: 'Por sesión / hora',       labelEn: 'Per session / hour'   },
  { value: 'monthly_retainer', labelEs: 'Mensualidad / retainer',  labelEn: 'Monthly retainer'     },
  { value: 'project_based',    labelEs: 'Por proyecto',            labelEn: 'Per project'          },
  { value: 'value_based',      labelEs: 'Por resultados',          labelEn: 'Value-based'          },
]

export function StepService({ lang, session, saving, onNext, onBack, step, total }: StepProps) {
  const [productDescription, setProductDescription] = useState(String(session.productDescription ?? ''))
  const [revenueModel, setRevenueModel]             = useState(String(session.revenueModel ?? ''))
  const [productPrice, setProductPrice]             = useState(session.productPrice != null ? String(session.productPrice) : '')
  const [businessStage, setBusinessStage]           = useState(String(session.businessStage ?? ''))

  const stageLabels: Record<string, string> = {
    starting: getText(lang, 'stageStarting'),
    selling:  getText(lang, 'stageSelling'),
    scaling:  getText(lang, 'stageScaling'),
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext({
      productDescription,
      revenueModel,
      productPrice: productPrice ? parseFloat(productPrice) : 0,
      businessStage,
    })
  }

  return (
    <div>
      <ProgressBar step={step} total={total} lang={lang} />
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">{getText(lang, 'step6Title')}</h1>
      <p className="text-sm text-zinc-500 mb-6">{getText(lang, 'step6Subtitle')}</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            {lang === 'en' ? 'What service do you offer?' : '¿Qué servicio ofreces?'}
          </label>
          <textarea
            value={productDescription}
            onChange={e => setProductDescription(e.target.value)}
            rows={4}
            required
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            {lang === 'en' ? 'How do you charge?' : '¿Cómo cobras?'}
          </label>
          <select
            value={revenueModel}
            onChange={e => setRevenueModel(e.target.value)}
            required
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
          >
            <option value="">{lang === 'en' ? 'Select...' : 'Selecciona...'}</option>
            {REVENUE_MODELS.map(m => (
              <option key={m.value} value={m.value}>
                {lang === 'en' ? m.labelEn : m.labelEs}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            {lang === 'en' ? 'Typical price (USD)' : 'Precio típico (USD)'}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={productPrice}
            onChange={e => setProductPrice(e.target.value)}
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">{getText(lang, 'businessStage')}</label>
          <div className="space-y-2">
            {STAGES.map(stage => (
              <label
                key={stage}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${
                  businessStage === stage
                    ? 'border-zinc-900 bg-zinc-50'
                    : 'border-zinc-200 hover:border-zinc-400'
                }`}
              >
                <input
                  type="radio"
                  name="businessStage"
                  value={stage}
                  checked={businessStage === stage}
                  onChange={() => setBusinessStage(stage)}
                  required
                  className="accent-zinc-900"
                />
                <span className="text-sm text-zinc-800">{stageLabels[stage]}</span>
              </label>
            ))}
          </div>
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
