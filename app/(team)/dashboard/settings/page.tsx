'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Workspace {
  id: string; name: string; slug: string; plan: string
  planMaxClients: number; primaryColor: string; logoUrl: string | null
  status: string; createdAt: string; clientCount: number
}

const PLAN_INFO: Record<string, { label: string; color: string; features: string[] }> = {
  free: {
    label: 'Free', color: 'bg-zinc-100 text-zinc-600',
    features: ['3 clientes', 'Pipeline CRM básico'],
  },
  starter: {
    label: 'Starter', color: 'bg-blue-50 text-blue-700',
    features: ['10 clientes', 'Estrategia con IA', 'Checklist + Propuestas'],
  },
  pro: {
    label: 'Pro', color: 'bg-violet-50 text-violet-700',
    features: ['50 clientes', 'Campañas + Contenido IA', 'Inteligencia de mercado', 'Validador de marca'],
  },
  agency: {
    label: 'Agency', color: 'bg-amber-50 text-amber-700',
    features: ['Clientes ilimitados', 'Todo incluido', 'Multi-usuario', 'Soporte prioritario'],
  },
}

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', primaryColor: '', logoUrl: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/workspace')
    if (res.ok) {
      const d = await res.json()
      setWorkspace(d)
      setForm({ name: d.name, primaryColor: d.primaryColor, logoUrl: d.logoUrl ?? '' })
    }
  }

  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    await fetch('/api/workspace', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, primaryColor: form.primaryColor, logoUrl: form.logoUrl || null }),
    })
    await load()
    setEditing(false)
    setSaving(false)
  }

  if (!workspace) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
    </div>
  )

  const planInfo = PLAN_INFO[workspace.plan] ?? PLAN_INFO.starter
  const usagePct = Math.min(100, Math.round((workspace.clientCount / workspace.planMaxClients) * 100))

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-900 transition">← Panel</Link>
        <span className="text-zinc-300">|</span>
        <span className="font-semibold text-zinc-900">Ajustes del workspace</span>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* Workspace identity */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-zinc-900">Identidad del workspace</h2>
            <button onClick={() => setEditing(!editing)}
              className="text-xs border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition">
              {editing ? 'Cancelar' : 'Editar'}
            </button>
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Nombre de la agencia</label>
                <input type="text" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Color primario (hex)</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.primaryColor}
                    onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer p-1" />
                  <input type="text" value={form.primaryColor}
                    onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))}
                    className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">URL del logo (opcional)</label>
                <input type="url" value={form.logoUrl}
                  onChange={e => setForm(p => ({ ...p, logoUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
              <button onClick={save} disabled={saving}
                className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-zinc-700 transition disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {workspace.logoUrl ? (
                  <img src={workspace.logoUrl} alt={workspace.name}
                    className="w-14 h-14 rounded-xl object-contain border border-zinc-100" />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                    style={{ backgroundColor: workspace.primaryColor }}>
                    {workspace.name[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-zinc-900">{workspace.name}</p>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">slug: {workspace.slug}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">ID: {workspace.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border border-zinc-200"
                  style={{ backgroundColor: workspace.primaryColor }} />
                <span className="text-xs font-mono text-zinc-500">{workspace.primaryColor}</span>
              </div>
            </div>
          )}
        </div>

        {/* Plan & usage */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-zinc-900">Plan y uso</h2>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${planInfo.color}`}>
              {planInfo.label}
            </span>
          </div>

          {/* Usage bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-zinc-500">Clientes activos</span>
              <span className="text-xs font-semibold text-zinc-900">
                {workspace.clientCount} / {workspace.planMaxClients === 999 ? '∞' : workspace.planMaxClients}
              </span>
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-400' : 'bg-zinc-900'}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>

          {/* Features */}
          <div className="mb-5">
            <p className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-widest">Incluido en tu plan</p>
            <ul className="space-y-1.5">
              {planInfo.features.map(f => (
                <li key={f} className="text-sm text-zinc-700 flex items-center gap-2">
                  <span className="text-green-500 text-xs">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {workspace.plan !== 'agency' && (
            <Link href="/signup"
              className="inline-block text-sm bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-700 transition font-medium">
              Mejorar plan →
            </Link>
          )}
        </div>

        {/* Account info */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Información de cuenta</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Estado</span>
              <span className={`font-medium ${workspace.status === 'active' ? 'text-green-700' : 'text-red-700'}`}>
                {workspace.status === 'active' ? 'Activo' : workspace.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Miembro desde</span>
              <span className="text-zinc-700">{new Date(workspace.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
