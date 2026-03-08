import { getText } from '@/lib/i18n'
import type { StepProps } from './types'

export function StepWelcome({ lang, session, saving, onNext }: StepProps) {
  const firstName = String(session.clientName ?? '').split(' ')[0] || ''

  return (
    <div className="min-h-[80vh] flex flex-col justify-between py-4">
      <div>
        {/* Brand mark */}
        <div className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-sm font-semibold text-zinc-900 tracking-wide">AVILION / HUMIND</span>
        </div>

        {/* Greeting */}
        <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest mb-3">
          {getText(lang, 'welcome')}{firstName ? `, ${firstName}` : ''}
        </p>
        <h1 className="text-3xl font-bold text-zinc-900 leading-tight mb-4">
          {lang === 'es'
            ? 'Construyamos tu estrategia desde adentro.'
            : "Let's build your strategy from the inside out."}
        </h1>
        <p className="text-zinc-500 leading-relaxed mb-8" style={{ whiteSpace: 'pre-line' }}>
          {getText(lang, 'welcomeSubtitle')}
        </p>

        {/* What we'll cover */}
        <div className="bg-zinc-50 rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
            {lang === 'es' ? 'En esta sesión vas a compartir' : "In this session you'll share"}
          </p>
          {[
            getText(lang, 'welcomeBullet1'),
            getText(lang, 'welcomeBullet2'),
            getText(lang, 'welcomeBullet3'),
          ].map((bullet, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-sm text-zinc-700">{bullet}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-10">
        <button
          onClick={() => onNext({})}
          disabled={saving}
          className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-semibold text-base hover:bg-zinc-700 transition disabled:opacity-50"
        >
          {saving ? getText(lang, 'saving') : getText(lang, 'begin')}
        </button>
        <p className="text-center text-xs text-zinc-400 mt-3">
          {lang === 'es' ? 'Tus respuestas son 100% confidenciales' : 'Your answers are 100% confidential'}
        </p>
      </div>
    </div>
  )
}
