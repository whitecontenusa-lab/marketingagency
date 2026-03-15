'use client'
import { useState } from 'react'
import { ProgressBar } from './ProgressBar'
import { getText } from '@/lib/i18n'
import type { StepProps } from './types'

export function StepPersonalBrand({ lang, session, saving, onNext, onBack, step, total }: StepProps) {
  const [expertise,            setExpertise]            = useState(String(session.expertise            ?? ''))
  const [personalStory,        setPersonalStory]        = useState(String(session.personalStory        ?? ''))
  const [credentialHighlights, setCredentialHighlights] = useState(String(session.credentialHighlights ?? ''))
  const [contentPillars,       setContentPillars]       = useState(String(session.contentPillars       ?? ''))
  const [targetAudience,       setTargetAudience]       = useState(String(session.targetAudience       ?? ''))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext({
      expertise,
      personalStory,
      credentialHighlights,
      contentPillars,
      targetAudience,
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
            {lang === 'en' ? 'What is your area of expertise?' : '¿En qué eres experto/a?'}
          </label>
          <input
            type="text"
            value={expertise}
            onChange={e => setExpertise(e.target.value)}
            required
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            {lang === 'en' ? 'Your personal story (100-200 words)' : 'Tu historia personal (100-200 palabras)'}
          </label>
          <textarea
            value={personalStory}
            onChange={e => setPersonalStory(e.target.value)}
            rows={5}
            required
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            {lang === 'en' ? 'Achievements & credentials' : 'Logros y credenciales'}
          </label>
          <textarea
            value={credentialHighlights}
            onChange={e => setCredentialHighlights(e.target.value)}
            rows={3}
            placeholder={
              lang === 'en'
                ? 'E.g.: Certified in X, featured in Y media, achieved Z result...'
                : 'Ej: Certificado en X, aparecí en Y media, logré Z resultado...'
            }
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none placeholder:text-zinc-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            {lang === 'en' ? 'Your 3 content pillars' : 'Tus 3 pilares de contenido'}
          </label>
          <input
            type="text"
            value={contentPillars}
            onChange={e => setContentPillars(e.target.value)}
            placeholder={
              lang === 'en'
                ? 'E.g.: Leadership, Productivity, Mental health'
                : 'Ej: Liderazgo, Productividad, Salud mental'
            }
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 placeholder:text-zinc-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            {lang === 'en' ? 'Who do you want to impact?' : '¿A quién quieres impactar?'}
          </label>
          <textarea
            value={targetAudience}
            onChange={e => setTargetAudience(e.target.value)}
            rows={3}
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
