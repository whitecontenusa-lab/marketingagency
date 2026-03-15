'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getText, type Lang } from '@/lib/i18n'

export default function ClientLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lang, setLang] = useState<Lang>('es')

  useEffect(() => {
    if (navigator.language.startsWith('en')) setLang('en')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/client/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(`/cliente/portal/${data.sessionId}`)
      } else {
        setError(data.error ?? getText(lang, 'login.error'))
      }
    } catch {
      setError(getText(lang, 'login.networkError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-1">Avilion</h1>
        <p className="text-zinc-500 text-sm mb-8">{getText(lang, 'login.subtitle')}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">{getText(lang, 'login.email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">{getText(lang, 'login.password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-zinc-700 transition disabled:opacity-50"
          >
            {loading ? getText(lang, 'login.submitting') : getText(lang, 'login.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
