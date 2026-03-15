'use client'
import { useState } from 'react'
import { ProgressBar } from './ProgressBar'
import { getText } from '@/lib/i18n'
import type { StepProps } from './types'

export function StepBranding({ lang, session, saving, onNext, onBack, step, total }: StepProps) {
  const [hasBranding, setHasBranding] = useState<boolean | null>(() => {
    const v = session.hasBranding
    if (v == null) return null
    // DB returns boolean; session typing is string|number|null — coerce safely
    if (v === 'false' || v === 0 || v === '0') return false
    return Boolean(v)
  })
  const [brandLogoUrl, setBrandLogoUrl] = useState(String(session.brandLogoUrl ?? ''))
  const [brandColors, setBrandColors] = useState(String(session.brandColors ?? ''))
  const [brandFonts, setBrandFonts] = useState(String(session.brandFonts ?? ''))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (hasBranding === null) return
    onNext({
      hasBranding,
      brandLogoUrl: hasBranding ? brandLogoUrl : '',
      brandColors: hasBranding ? brandColors : '',
      brandFonts: hasBranding ? brandFonts : '',
    })
  }

  return (
    <div>
      <ProgressBar step={step} total={total} lang={lang} />
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">{getText(lang, 'step8Title')}</h1>
      <p className="text-sm text-zinc-500 mb-6">{getText(lang, 'step8Subtitle')}</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Selection cards */}
        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={() => setHasBranding(true)}
            className={`flex items-start gap-4 p-5 rounded-xl border text-left transition ${
              hasBranding === true
                ? 'border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900'
                : 'border-zinc-200 hover:border-zinc-400 bg-white'
            }`}
          >
            <span className="text-2xl mt-0.5">✅</span>
            <div>
              <span className="block text-sm font-semibold text-zinc-900">{getText(lang, 'hasBrandingYes')}</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setHasBranding(false)}
            className={`flex items-start gap-4 p-5 rounded-xl border text-left transition ${
              hasBranding === false
                ? 'border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900'
                : 'border-zinc-200 hover:border-zinc-400 bg-white'
            }`}
          >
            <span className="text-2xl mt-0.5">🚀</span>
            <div>
              <span className="block text-sm font-semibold text-zinc-900">{getText(lang, 'hasBrandingNo')}</span>
            </div>
          </button>
        </div>

        {/* Conditional: has existing branding — show extra fields */}
        {hasBranding === true && (
          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">{getText(lang, 'brandLogoUrl')}</label>
              <input
                type="url"
                value={brandLogoUrl}
                onChange={e => setBrandLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">{getText(lang, 'brandColors')}</label>
              <input
                type="text"
                value={brandColors}
                onChange={e => setBrandColors(e.target.value)}
                placeholder={lang === 'en' ? 'E.g.: Blue #1A73E8, Black #000000' : 'Ej: Azul #1A73E8, Negro #000000'}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">{getText(lang, 'brandFonts')}</label>
              <input
                type="text"
                value={brandFonts}
                onChange={e => setBrandFonts(e.target.value)}
                placeholder={lang === 'en' ? 'E.g.: Montserrat (headings), Open Sans (body)' : 'Ej: Montserrat (títulos), Open Sans (cuerpo)'}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>
        )}

        {/* Conditional: no branding — show confirmation note */}
        {hasBranding === false && (
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-5 py-4">
            <p className="text-sm text-zinc-600">{getText(lang, 'brandingBriefNote')}</p>
          </div>
        )}

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
            disabled={saving || hasBranding === null}
            className="flex-1 bg-zinc-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-zinc-700 transition disabled:opacity-50"
          >
            {saving ? getText(lang, 'saving') : getText(lang, 'next')}
          </button>
        </div>
      </form>
    </div>
  )
}
