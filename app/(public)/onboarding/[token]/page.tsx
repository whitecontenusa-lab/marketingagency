'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function OnboardingStart() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sessionData, setSessionData] = useState<{ language: string } | null>(null)
  const [selecting, setSelecting] = useState(false)

  useEffect(() => {
    fetch(`/api/onboarding/${token}`)
      .then(async res => {
        if (res.status === 409) {
          setError('Este formulario ya fue completado. Contacta al equipo de Avilion si tienes dudas.')
          return
        }
        if (res.status === 410) {
          setError('Este enlace ha expirado. Contacta al equipo de Avilion para obtener uno nuevo.')
          return
        }
        if (!res.ok) throw new Error('invalid')
        const data = await res.json()
        setSessionData(data)
      })
      .catch(() => setError('Este enlace no es válido o ha expirado.'))
      .finally(() => setLoading(false))
  }, [token])

  async function selectLanguage(lang: 'es' | 'en') {
    if (selecting) return
    setSelecting(true)
    await fetch(`/api/onboarding/${token}/save`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang }),
    })
    router.push(`/onboarding/${token}/paso/1`)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-6">
      <div className="text-center">
        <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center mx-auto mb-5">
          <span className="text-white font-bold text-base">A</span>
        </div>
        <p className="text-zinc-900 font-semibold mb-2">Enlace inválido</p>
        <p className="text-zinc-500 text-sm max-w-xs">{error}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-xs">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Avilion / Humind</h1>
          <p className="text-zinc-400 text-xs mt-1 tracking-wide uppercase">Client Onboarding Portal</p>
        </div>

        {/* Language prompt */}
        <p className="text-center text-sm text-zinc-500 mb-5">Elige tu idioma · Choose your language</p>

        {/* Language cards */}
        <div className="flex gap-3">
          <button
            onClick={() => selectLanguage('es')}
            disabled={selecting}
            className="flex-1 bg-white border-2 border-zinc-200 rounded-2xl p-6 hover:border-zinc-900 hover:shadow-sm transition cursor-pointer disabled:opacity-50 text-left"
          >
            <div className="text-4xl mb-3">🇪🇸</div>
            <div className="font-semibold text-zinc-900 text-base">Español</div>
            <div className="text-xs text-zinc-400 mt-0.5">Continuar en español</div>
          </button>
          <button
            onClick={() => selectLanguage('en')}
            disabled={selecting}
            className="flex-1 bg-white border-2 border-zinc-200 rounded-2xl p-6 hover:border-zinc-900 hover:shadow-sm transition cursor-pointer disabled:opacity-50 text-left"
          >
            <div className="text-4xl mb-3">🇺🇸</div>
            <div className="font-semibold text-zinc-900 text-base">English</div>
            <div className="text-xs text-zinc-400 mt-0.5">Continue in English</div>
          </button>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-zinc-300 mt-8">
          {selecting ? 'Loading...' : 'Your answers are 100% confidential'}
        </p>
      </div>
    </div>
  )
}
