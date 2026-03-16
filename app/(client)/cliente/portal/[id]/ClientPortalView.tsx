'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { marked } from 'marked'
import { getText, t, type Lang } from '@/lib/i18n'
import { DeliveryCountdown } from './DeliveryCountdown'
import TabContenidoCiclo from '@/components/portal/TabContenidoCiclo'
import TabMisReportes from '@/components/portal/TabMisReportes'
import TabCalendario from '@/components/portal/TabCalendario'

type DocKey = 'perfil' | 'funnel' | 'contenido' | 'itr' | 'roadmap'

interface Strategy {
  funnelType: number
  emotionalArchetype: string
  funnelReason: string
  simulationNotes: string
  documents: {
    perfil?: string
    funnel?: string
    contenido?: string
    itr?: string
    roadmap?: string
  }
}

interface Props {
  sessionId: string
  clientName: string
  brandName: string
  approvedAt: string | null
  strategy: Record<string, unknown> | null
  language: 'es' | 'en'
  deliveredAt?: string | null
}

export default function ClientPortalView({ sessionId, clientName, brandName, approvedAt, strategy: rawStrategy, language, deliveredAt }: Props) {
  const router = useRouter()
  const [activeDoc, setActiveDoc] = useState<DocKey>('perfil')
  const [loggingOut, setLoggingOut] = useState(false)
  const [portalTab, setPortalTab] = useState<'strategy' | 'content' | 'calendar' | 'reports'>('strategy')

  const lang: Lang = language === 'en' ? 'en' : 'es'
  const strategy = rawStrategy as Strategy | null

  const funnelNames = t[lang].portal.funnelNames as Record<string, string>

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/client/auth/logout', { method: 'POST' })
    router.push('/cliente/login')
  }

  const displayName = brandName || clientName

  const TAB_LABELS: Record<DocKey, string> = {
    perfil: getText(lang, 'portal.tabPerfil'),
    funnel: getText(lang, 'portal.tabFunnel'),
    contenido: getText(lang, 'portal.tabContenido'),
    itr: getText(lang, 'portal.tabItr'),
    roadmap: getText(lang, 'portal.tabRoadmap'),
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Minimal nav */}
      <nav className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <span className="font-semibold text-zinc-900">{displayName}</span>
          {brandName && clientName && brandName !== clientName && (
            <span className="text-zinc-400 text-sm ml-2">{clientName}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {approvedAt && (
            <span className="text-xs bg-green-50 text-green-700 font-medium px-3 py-1 rounded-full">
              {getText(lang, 'portal.strategyReady')}
            </span>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-sm text-zinc-400 hover:text-zinc-900 transition disabled:opacity-50"
          >
            {loggingOut ? getText(lang, 'portal.loggingOut') : getText(lang, 'portal.logout')}
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Top-level portal tabs */}
        <div className="flex gap-1 p-1 bg-zinc-800 rounded-lg mb-6">
          <button
            onClick={() => setPortalTab('strategy')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              portalTab === 'strategy' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {lang === 'en' ? 'My Strategy' : 'Mi Estrategia'}
          </button>
          <button
            onClick={() => setPortalTab('content')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              portalTab === 'content' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {lang === 'en' ? 'Monthly Content' : 'Contenido del Mes'}
          </button>
          <button
            onClick={() => setPortalTab('calendar')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              portalTab === 'calendar' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {lang === 'en' ? 'Calendar' : 'Calendario'}
          </button>
          <button
            onClick={() => setPortalTab('reports')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              portalTab === 'reports' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {lang === 'en' ? 'My Reports' : 'Mis Reportes'}
          </button>
        </div>

        {portalTab === 'content' && (
          <TabContenidoCiclo sessionId={sessionId} lang={lang} />
        )}

        {portalTab === 'calendar' && (
          <div className="bg-white rounded-2xl border border-zinc-100 p-6">
            <TabCalendario sessionId={sessionId} lang={lang} />
          </div>
        )}

        {portalTab === 'reports' && (
          <TabMisReportes sessionId={sessionId} lang={lang} />
        )}

        {portalTab === 'strategy' && (!strategy && deliveredAt ? (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800">
            <DeliveryCountdown deliveredAt={deliveredAt} lang={lang} />
          </div>
        ) : !strategy ? (
          <div className="bg-white rounded-2xl border border-zinc-100 p-10 text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">⏳</div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">{getText(lang, 'portal.strategyPending')}</h3>
            <p className="text-zinc-500 text-sm max-w-md mx-auto">
              {getText(lang, 'portal.strategyPendingDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Strategy header */}
            <div className="bg-zinc-900 text-white rounded-2xl p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">
                    {getText(lang, 'portal.tabStrategy')}
                  </p>
                  <h3 className="text-xl font-bold">
                    {getText(lang, 'portal.funnelLabel')} {strategy.funnelType} — {funnelNames[String(strategy.funnelType)] ?? ''}
                  </h3>
                </div>
                <span className="text-xs bg-white/10 px-3 py-1.5 rounded-full font-medium flex-shrink-0 ml-4">
                  {strategy.emotionalArchetype}
                </span>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">{strategy.funnelReason}</p>
              {approvedAt && (
                <p className="text-xs text-zinc-500 mt-3">
                  {getText(lang, 'portal.approvedOn')}{' '}
                  {new Date(approvedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>

            {/* Document tabs */}
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              <div className="flex border-b border-zinc-100 overflow-x-auto">
                {(['perfil', 'funnel', 'contenido', 'itr', 'roadmap'] as DocKey[]).map(doc => {
                  if (doc === 'roadmap' && !strategy.documents?.roadmap) return null
                  return (
                    <button
                      key={doc}
                      onClick={() => setActiveDoc(doc)}
                      className={`flex-1 py-3 px-4 text-sm font-medium transition whitespace-nowrap ${
                        activeDoc === doc
                          ? 'bg-zinc-900 text-white'
                          : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                      }`}
                    >
                      {TAB_LABELS[doc]}
                    </button>
                  )
                })}
              </div>
              <div className="p-6">
                <div className="flex justify-end mb-3">
                  <button
                    onClick={() => {
                      const content = strategy.documents?.[activeDoc] ?? ''
                      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `${activeDoc}-${(brandName || clientName).replace(/\s+/g, '-').toLowerCase()}.txt`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      URL.revokeObjectURL(url)
                    }}
                    className="text-xs border border-zinc-200 text-zinc-500 hover:bg-zinc-50 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                  >
                    ↓ {lang === 'es' ? 'Descargar' : 'Download'}
                  </button>
                </div>
                <div
                  className="prose prose-zinc prose-sm max-w-none overflow-auto max-h-[600px] [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-zinc-900 [&_h1]:mb-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-zinc-800 [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-zinc-700 [&_h3]:mt-4 [&_h3]:mb-2 [&_li]:text-sm [&_li]:text-zinc-700 [&_p]:text-sm [&_p]:text-zinc-700 [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-zinc-900 [&_ul]:space-y-1 [&_ol]:space-y-1"
                  dangerouslySetInnerHTML={{ __html: marked(strategy.documents?.[activeDoc] ?? '') as string }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
