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

      {/* Feature preview section */}
      <div className="flex-1 px-6 py-10 max-w-md mx-auto w-full">
        {/* Email note */}
        <div className="flex items-start gap-3 mb-2">
          <span className="text-zinc-400 text-lg leading-none mt-0.5">📧</span>
          <p className="text-sm text-zinc-500">
            {lang === 'es'
              ? 'Recibirás tus credenciales de acceso por email en las próximas horas.'
              : "You'll receive your portal access credentials by email within the next few hours."}
          </p>
        </div>

        {/* Section heading */}
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4 mt-8">
          {lang === 'es' ? 'Lo que recibirás' : "What you'll receive"}
        </p>

        {/* Feature cards */}
        <div className="space-y-3">
          {/* Card 1 — Personalized strategy */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg">✦</span>
            </div>
            <div>
              <p className="font-semibold text-sm text-zinc-900 mb-1">
                {lang === 'es' ? 'Estrategia personalizada' : 'Personalized strategy'}
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {lang === 'es'
                  ? 'Un blueprint completo con tu funnel, perfil de marca, estrategia de contenido y hoja de ruta.'
                  : 'A complete blueprint with your funnel, brand profile, content strategy, and roadmap.'}
              </p>
            </div>
          </div>

          {/* Card 2 — Content pieces */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">📅</span>
            </div>
            <div>
              <p className="font-semibold text-sm text-zinc-900 mb-1">
                {lang === 'es' ? '30 piezas de contenido / mes' : '30 content pieces / month'}
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {lang === 'es'
                  ? 'Cada mes, 30 piezas listas para publicar adaptadas a tus plataformas y voz de marca.'
                  : 'Every month, 30 publish-ready pieces tailored to your platforms and brand voice.'}
              </p>
            </div>
          </div>

          {/* Card 3 — Monthly report */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">📊</span>
            </div>
            <div>
              <p className="font-semibold text-sm text-zinc-900 mb-1">
                {lang === 'es' ? 'Reporte mensual de progreso' : 'Monthly progress report'}
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {lang === 'es'
                  ? 'Un reporte con tus logros del mes y una vista previa de lo que viene.'
                  : 'A report with your monthly achievements and a preview of what\'s coming.'}
              </p>
            </div>
          </div>
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
