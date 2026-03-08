import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { getText } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

export const metadata: Metadata = {
  title: '¡Todo listo! — Avilion Humind',
  description: 'Tu información fue enviada exitosamente',
}

export default async function GraciasPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const session = await db.onboardingSession.findUnique({ where: { token } })
  const lang = (session?.language ?? 'es') as Lang
  const name = session?.clientName?.split(' ')[0] || ''

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Top dark hero */}
      <div className="bg-zinc-900 px-6 py-14 flex flex-col items-center text-center">
        <div className="w-14 h-14 bg-green-400 rounded-full flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-zinc-900" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {getText(lang, 'thankYouTitle').replace('[nombre]', name).replace('[name]', name)}
        </h1>
        <p className="text-zinc-400 text-sm max-w-xs">
          {getText(lang, 'thankYouSubtitle')}
        </p>
      </div>

      {/* Next steps */}
      <div className="flex-1 px-6 py-10 max-w-md mx-auto w-full">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-5">
          {lang === 'es' ? 'Próximos pasos' : 'What happens next'}
        </p>
        <div className="space-y-4">
          {[
            lang === 'es'
              ? 'Nuestro equipo revisará tu información a detalle.'
              : 'Our team will carefully review your information.',
            lang === 'es'
              ? 'Te contactaremos dentro de las próximas 24 horas.'
              : "We'll reach out within the next 24 hours.",
            lang === 'es'
              ? 'Prepararemos una estrategia personalizada para tu marca.'
              : "We'll prepare a personalized strategy for your brand.",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-4 bg-white rounded-2xl p-4 border border-zinc-100">
              <div className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-sm text-zinc-700 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>

        {/* Extra note from i18n */}
        <p className="text-xs text-zinc-400 text-center mt-8 leading-relaxed">
          {getText(lang, 'thankYouNote')}
        </p>

        {/* Brand footer */}
        <div className="flex items-center justify-center gap-2 mt-10">
          <div className="w-6 h-6 bg-zinc-900 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">A</span>
          </div>
          <span className="text-xs font-semibold text-zinc-400 tracking-wide">AVILION / HUMIND</span>
        </div>
      </div>
    </div>
  )
}
