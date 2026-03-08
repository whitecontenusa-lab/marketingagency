'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function NuevoClientePage() {
  const [form, setForm] = useState({ clientName: '', brandName: '', email: '', industry: '', country: 'Colombia', language: 'es' })
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al generar el enlace')
        return
      }
      const data = await res.json()
      setLink(data.link)
    } catch {
      setError('Error de red, intenta de nuevo')
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — link is visible in the box above for manual copy
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 px-6 py-4">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">← Volver al panel</Link>
      </nav>

      <main className="max-w-lg mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Nuevo Cliente</h1>
        <p className="text-zinc-500 text-sm mb-8">Completa los datos básicos para generar el enlace de onboarding.</p>

        {!link ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-4">
            {[
              { label: 'Nombre completo del cliente', key: 'clientName', required: true },
              { label: 'Nombre de la marca (opcional)', key: 'brandName' },
              { label: 'Email del cliente (opcional)', key: 'email', type: 'email' },
              { label: 'Industria (opcional)', key: 'industry' },
              { label: 'País', key: 'country' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{field.label}</label>
                <input
                  type={field.type || 'text'}
                  required={field.required}
                  value={form[field.key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Idioma preferido</label>
              <select
                value={form.language}
                onChange={e => setForm(prev => ({ ...prev, language: e.target.value }))}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-zinc-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-zinc-700 transition disabled:opacity-50">
              {loading ? 'Generando...' : 'Generar Enlace de Onboarding'}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">✓</div>
              <p className="font-medium text-zinc-900">Enlace generado — válido por 7 días</p>
            </div>
            <div className="bg-zinc-50 rounded-lg p-3 text-sm text-zinc-600 break-all mb-4">{link}</div>
            <button onClick={copyLink}
              className="w-full border border-zinc-200 rounded-lg py-2 text-sm font-medium hover:bg-zinc-50 transition">
              {copied ? '¡Copiado! ✓' : 'Copiar enlace'}
            </button>
            <Link href="/dashboard" className="block text-center mt-4 text-sm text-zinc-500 hover:text-zinc-900">
              Ver todos los clientes →
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
