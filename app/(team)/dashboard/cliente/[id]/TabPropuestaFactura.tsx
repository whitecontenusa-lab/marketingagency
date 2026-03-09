'use client'
import { useEffect, useState } from 'react'

interface Proposal {
  id: string; version: number; status: string
  diagnosis: string; pricingEntry: number; pricingCore: number; pricingPremium: number
  selectedTier: string | null; notes: string; sentAt: string | null; respondedAt: string | null
}
interface Invoice { id: string; amount: number; currency: string; status: string; description: string; paymentUrl: string | null; dueDate: string | null; paidAt: string | null; createdAt: string }

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft:    { label: 'Borrador',   cls: 'bg-zinc-100 text-zinc-600' },
  sent:     { label: 'Enviada',    cls: 'bg-blue-50 text-blue-700' },
  accepted: { label: 'Aceptada',   cls: 'bg-green-50 text-green-700' },
  rejected: { label: 'Rechazada',  cls: 'bg-red-50 text-red-700' },
  ghosted:  { label: 'Sin respuesta', cls: 'bg-yellow-50 text-yellow-700' },
}

const INV_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pendiente', cls: 'bg-yellow-50 text-yellow-700' },
  paid:      { label: 'Pagada',    cls: 'bg-green-50 text-green-700' },
  overdue:   { label: 'Vencida',   cls: 'bg-red-50 text-red-700' },
  cancelled: { label: 'Cancelada', cls: 'bg-zinc-100 text-zinc-500' },
}

export default function TabPropuestaFactura({ sessionId }: { sessionId: string }) {
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ diagnosis: '', pricingEntry: '', pricingCore: '', pricingPremium: '', notes: '' })
  const [invForm, setInvForm] = useState({ amount: '', description: '', paymentUrl: '', dueDate: '' })
  const [addingInv, setAddingInv] = useState(false)

  async function load() {
    const [pRes, iRes] = await Promise.all([
      fetch(`/api/sessions/${sessionId}/proposal`),
      fetch(`/api/sessions/${sessionId}/invoice`),
    ])
    if (pRes.ok) {
      const p: Proposal | null = await pRes.json()
      setProposal(p)
      if (p) setForm({ diagnosis: p.diagnosis, pricingEntry: String(p.pricingEntry), pricingCore: String(p.pricingCore), pricingPremium: String(p.pricingPremium), notes: p.notes })
    }
    if (iRes.ok) setInvoices(await iRes.json())
  }

  useEffect(() => { load() }, [sessionId])

  async function saveProposal() {
    setSaving(true)
    const method = proposal ? 'PATCH' : 'POST'
    const res = await fetch(`/api/sessions/${sessionId}/proposal`, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, pricingEntry: Number(form.pricingEntry), pricingCore: Number(form.pricingCore), pricingPremium: Number(form.pricingPremium) }),
    })
    if (res.ok) { await load(); setEditing(false) }
    setSaving(false)
  }

  async function updateStatus(status: string) {
    await fetch(`/api/sessions/${sessionId}/proposal`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await load()
  }

  async function createInvoice() {
    setSaving(true)
    await fetch(`/api/sessions/${sessionId}/invoice`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...invForm, amount: Number(invForm.amount), proposalId: proposal?.id }),
    })
    setInvForm({ amount: '', description: '', paymentUrl: '', dueDate: '' })
    setAddingInv(false)
    await load()
    setSaving(false)
  }

  async function markPaid(invoiceId: string) {
    await fetch(`/api/sessions/${sessionId}/invoice`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId, status: 'paid' }),
    })
    await load()
  }

  return (
    <div className="space-y-6">
      {/* Proposal */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-zinc-900">Propuesta comercial</p>
          <div className="flex items-center gap-2">
            {proposal && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_LABELS[proposal.status]?.cls ?? ''}`}>
                {STATUS_LABELS[proposal.status]?.label}
              </span>
            )}
            <button onClick={() => setEditing(!editing)}
              className="text-xs border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition">
              {editing ? 'Cancelar' : proposal ? 'Editar' : '+ Nueva'}
            </button>
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-600 mb-1 block">Diagnóstico</label>
              <textarea rows={4} value={form.diagnosis} onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(['pricingEntry', 'pricingCore', 'pricingPremium'] as const).map((field, i) => (
                <div key={field}>
                  <label className="text-xs font-medium text-zinc-600 mb-1 block">{['Entrada (USD)', 'Core (USD)', 'Premium (USD)'][i]}</label>
                  <input type="number" value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 mb-1 block">Notas internas</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>
            <button onClick={saveProposal} disabled={saving}
              className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-zinc-700 transition disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar propuesta'}
            </button>
          </div>
        ) : proposal ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{proposal.diagnosis || <span className="text-zinc-400 italic">Sin diagnóstico</span>}</p>
            <div className="grid grid-cols-3 gap-3 mt-3">
              {[{ label: 'Entrada', value: proposal.pricingEntry }, { label: 'Core', value: proposal.pricingCore }, { label: 'Premium', value: proposal.pricingPremium }].map(t => (
                <div key={t.label} className="bg-zinc-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-zinc-400 mb-1">{t.label}</p>
                  <p className="text-lg font-bold text-zinc-900">${t.value.toLocaleString()}</p>
                  <p className="text-xs text-zinc-400">USD</p>
                </div>
              ))}
            </div>
            {proposal.status === 'draft' && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => updateStatus('sent')} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">Marcar como enviada</button>
              </div>
            )}
            {proposal.status === 'sent' && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => updateStatus('accepted')} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition">Aceptada</button>
                <button onClick={() => updateStatus('rejected')} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition">Rechazada</button>
                <button onClick={() => updateStatus('ghosted')} className="text-xs bg-zinc-100 text-zinc-600 px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition">Sin respuesta</button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-400 text-center py-6">No hay propuesta creada aún.</p>
        )}
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-zinc-900">Facturación</p>
          <button onClick={() => setAddingInv(!addingInv)}
            className="text-xs border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition">
            {addingInv ? 'Cancelar' : '+ Nueva factura'}
          </button>
        </div>

        {addingInv && (
          <div className="space-y-3 mb-4 p-4 bg-zinc-50 rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Monto (USD)</label>
                <input type="number" value={invForm.amount} onChange={e => setInvForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Fecha límite</label>
                <input type="date" value={invForm.dueDate} onChange={e => setInvForm(p => ({ ...p, dueDate: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 mb-1 block">Descripción</label>
              <input type="text" value={invForm.description} onChange={e => setInvForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Ej: Mes 1 — Estrategia y onboarding"
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 mb-1 block">Link de pago (opcional)</label>
              <input type="url" value={invForm.paymentUrl} onChange={e => setInvForm(p => ({ ...p, paymentUrl: e.target.value }))}
                placeholder="https://stripe.com/..."
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>
            <button onClick={createInvoice} disabled={!invForm.amount || saving}
              className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-zinc-700 transition disabled:opacity-50">
              {saving ? 'Guardando...' : 'Crear factura'}
            </button>
          </div>
        )}

        {invoices.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-6">No hay facturas aún.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between bg-zinc-50 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">${inv.amount.toLocaleString()} {inv.currency}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{inv.description}</p>
                  {inv.paymentUrl && (
                    <a href={inv.paymentUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-0.5 block">Link de pago →</a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${INV_STATUS[inv.status]?.cls ?? ''}`}>
                    {INV_STATUS[inv.status]?.label}
                  </span>
                  {inv.status === 'pending' && (
                    <button onClick={() => markPaid(inv.id)}
                      className="text-xs text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-lg transition">
                      Marcar pagada
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
