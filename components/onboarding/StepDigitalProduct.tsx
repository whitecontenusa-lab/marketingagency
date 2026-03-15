'use client'
import { useState } from 'react'
import { ProgressBar } from './ProgressBar'
import { getText } from '@/lib/i18n'
import type { StepProps } from './types'

const STAGES = ['starting', 'selling', 'scaling'] as const

const PRODUCT_TYPES = [
  { value: 'ebook',      labelEs: 'Ebook / Guía',              labelEn: 'Ebook / Guide'           },
  { value: 'course',     labelEs: 'Curso online',              labelEn: 'Online course'            },
  { value: 'template',   labelEs: 'Template / Plantilla',      labelEn: 'Template'                 },
  { value: 'app',        labelEs: 'App / Software',            labelEn: 'App / Software'           },
  { value: 'membership', labelEs: 'Membresía / Comunidad',     labelEn: 'Membership / Community'   },
  { value: 'other',      labelEs: 'Otro',                      labelEn: 'Other'                    },
]

export function StepDigitalProduct({ lang, session, saving, onNext, onBack, step, total }: StepProps) {
  const [specificProduct, setSpecificProduct] = useState(String(session.specificProduct ?? ''))
  const [productDescription, setProductDescription] = useState(String(session.productDescription ?? ''))
  const [productPrice, setProductPrice]             = useState(session.productPrice != null ? String(session.productPrice) : '')
  const [businessStage, setBusinessStage]           = useState(String(session.businessStage ?? ''))
  const [monthlyRevenue, setMonthlyRevenue]         = useState(session.monthlyRevenue != null ? String(session.monthlyRevenue) : '')

  const stageLabels: Record<string, string> = {
    starting: getText(lang, 'stageStarting'),
    selling:  getText(lang, 'stageSelling'),
    scaling:  getText(lang, 'stageScaling'),
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext({
      specificProduct,
      productDescription,
      productPrice:    productPrice    ? parseFloat(productPrice)    : 0,
      businessStage,
      monthlyRevenue:  monthlyRevenue  ? parseFloat(monthlyRevenue)  : 0,
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
            {lang === 'en' ? 'Type of digital product' : 'Tipo de producto digital'}
          </label>
          <select
            value={specificProduct}
            onChange={e => setSpecificProduct(e.target.value)}
            required
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
          >
            <option value="">{lang === 'en' ? 'Select...' : 'Selecciona...'}</option>
            {PRODUCT_TYPES.map(p => (
              <option key={p.value} value={p.value}>
                {lang === 'en' ? p.labelEn : p.labelEs}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            {lang === 'en' ? 'What does it teach or do?' : '¿Qué enseña o hace?'}
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
            {lang === 'en' ? 'Price (USD)' : 'Precio (USD)'}
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
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            {lang === 'en' ? 'Monthly revenue approx. (USD)' : 'Ingresos mensuales aprox. (USD)'}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={monthlyRevenue}
            onChange={e => setMonthlyRevenue(e.target.value)}
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
          <p className="text-xs text-zinc-400 mt-1">{getText(lang, 'monthlyRevenueHint')}</p>
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
