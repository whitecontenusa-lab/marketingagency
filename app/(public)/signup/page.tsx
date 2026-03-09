'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const PLANS = [
  {
    key: 'starter',
    label: 'Starter',
    price: '$99/mes',
    clients: '10 clientes',
    features: ['Pipeline CRM', 'Estrategia con IA', 'Checklist de onboarding', 'Propuestas y facturas'],
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '$249/mes',
    clients: '50 clientes',
    features: ['Todo en Starter', 'Campañas y contenido IA', 'Inteligencia de mercado', 'Validador de marca'],
    highlight: true,
  },
  {
    key: 'agency',
    label: 'Agency',
    price: '$599/mes',
    clients: 'Clientes ilimitados',
    features: ['Todo en Pro', 'White-label', 'Multi-usuario', 'Soporte prioritario'],
  },
]

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<'plan' | 'account'>('plan')
  const [selectedPlan, setSelectedPlan] = useState('pro')
  const [form, setForm] = useState({ agencyName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, plan: selectedPlan }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    // Redirect to login with success message
    router.push('/login?signed_up=1')
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="px-8 py-5 flex items-center justify-between border-b border-white/5">
        <span className="font-bold text-lg tracking-tight">Humind</span>
        <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition">
          Ya tengo cuenta →
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {step === 'plan' && (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-3">Tu agencia. Automatizada.</h1>
              <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                El ecosistema de IA que genera estrategias, gestiona clientes y crea contenido — todo en un solo lugar.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-10">
              {PLANS.map(plan => (
                <div
                  key={plan.key}
                  onClick={() => setSelectedPlan(plan.key)}
                  className={`rounded-2xl p-6 cursor-pointer border-2 transition ${
                    selectedPlan === plan.key
                      ? 'border-white bg-white/5'
                      : 'border-white/10 hover:border-white/30'
                  } ${plan.highlight ? 'ring-1 ring-violet-500/50' : ''}`}
                >
                  {plan.highlight && (
                    <span className="text-xs bg-violet-600 text-white px-2.5 py-1 rounded-full font-medium mb-3 inline-block">
                      Más popular
                    </span>
                  )}
                  <h3 className="text-lg font-bold mb-1">{plan.label}</h3>
                  <p className="text-2xl font-bold mb-0.5">{plan.price}</p>
                  <p className="text-sm text-zinc-400 mb-4">{plan.clients}</p>
                  <ul className="space-y-2">
                    {plan.features.map(f => (
                      <li key={f} className="text-sm text-zinc-300 flex items-center gap-2">
                        <span className="text-green-400">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => setStep('account')}
                className="bg-white text-zinc-900 font-semibold px-10 py-3.5 rounded-xl hover:bg-zinc-100 transition text-sm"
              >
                Continuar con {PLANS.find(p => p.key === selectedPlan)?.label} →
              </button>
              <p className="text-xs text-zinc-500 mt-3">Sin tarjeta de crédito requerida para comenzar.</p>
            </div>
          </>
        )}

        {step === 'account' && (
          <div className="max-w-md mx-auto">
            <button onClick={() => setStep('plan')} className="text-sm text-zinc-400 hover:text-white mb-8 inline-block transition">
              ← Cambiar plan
            </button>
            <h2 className="text-2xl font-bold mb-2">Crea tu cuenta</h2>
            <p className="text-zinc-400 text-sm mb-8">
              Plan seleccionado: <span className="text-white font-medium capitalize">{selectedPlan}</span>
            </p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Nombre de la agencia</label>
                <input
                  type="text" required value={form.agencyName}
                  onChange={e => setForm(p => ({ ...p, agencyName: e.target.value }))}
                  placeholder="Mi Agencia Digital"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Correo electrónico</label>
                <input
                  type="email" required value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="admin@miagencia.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Contraseña</label>
                <input
                  type="password" required value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit" disabled={loading}
                className="w-full bg-white text-zinc-900 font-semibold py-3.5 rounded-xl hover:bg-zinc-100 transition disabled:opacity-50 text-sm mt-2"
              >
                {loading ? 'Creando cuenta...' : 'Crear cuenta gratis →'}
              </button>
            </form>

            <p className="text-xs text-zinc-500 mt-6 text-center">
              Al registrarte aceptas los Términos de Servicio y Política de Privacidad de Humind.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
