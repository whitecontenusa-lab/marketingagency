'use client'
import { useState } from 'react'

interface TabProps {
  data: Record<string, unknown>
  onSave: (fields: Record<string, unknown>) => Promise<void>
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</label>
      {hint && <p className="text-xs text-zinc-400 -mt-0.5">{hint}</p>}
      {children}
    </div>
  )
}

const textareaClass =
  'w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-none'

const inputClass =
  'w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent'

const FUNNEL_TYPES = [
  { value: 0, label: 'Sin definir' },
  { value: 1, label: 'Tipo 1 — Servicio directo / Consultoría' },
  { value: 2, label: 'Tipo 2 — Producto digital / Curso' },
  { value: 3, label: 'Tipo 3 — Membresía / Recurrente' },
  { value: 4, label: 'Tipo 4 — E-commerce / Producto físico' },
  { value: 5, label: 'Tipo 5 — Funnel mixto / Híbrido' },
]

export function TabFunnel({ data, onSave }: TabProps) {
  const profile = (data.client as Record<string, unknown> | null)?.profile as Record<string, unknown> | null

  const [funnelType, setFunnelType] = useState<number>((profile?.funnelType as number) ?? 0)
  const [funnelReason, setFunnelReason] = useState((profile?.funnelReason as string) ?? '')
  const [pricingEntry, setPricingEntry] = useState((profile?.pricingEntry as string) ?? '')
  const [pricingCore, setPricingCore] = useState((profile?.pricingCore as string) ?? '')
  const [pricingPremium, setPricingPremium] = useState((profile?.pricingPremium as string) ?? '')
  const [valuePromise, setValuePromise] = useState((profile?.valuePromise as string) ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave({
      funnelType,
      funnelReason,
      pricingEntry,
      pricingCore,
      pricingPremium,
      valuePromise,
    })
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-6">
      <h2 className="text-lg font-semibold text-zinc-900">Estructura del Funnel</h2>

      <div className="grid grid-cols-1 gap-5">
        <Field label="Tipo de funnel" hint="Selecciona el modelo de negocio que mejor describe la estructura de venta">
          <select
            className={inputClass}
            value={funnelType}
            onChange={e => setFunnelType(Number(e.target.value))}
          >
            {FUNNEL_TYPES.map(ft => (
              <option key={ft.value} value={ft.value}>{ft.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Justificación del tipo de funnel" hint="¿Por qué este tipo de funnel es el más adecuado para este cliente?">
          <textarea
            rows={3}
            className={textareaClass}
            placeholder="Explica por qué este modelo encaja con el negocio, audiencia y producto del cliente..."
            value={funnelReason}
            onChange={e => setFunnelReason(e.target.value)}
          />
        </Field>

        <Field label="Promesa de valor central" hint="La transformación o resultado principal que justifica la compra">
          <textarea
            rows={3}
            className={textareaClass}
            placeholder="En una frase poderosa: ¿qué obtiene exactamente el cliente y por qué importa?..."
            value={valuePromise}
            onChange={e => setValuePromise(e.target.value)}
          />
        </Field>
      </div>

      <hr className="border-zinc-100" />
      <h3 className="text-sm font-semibold text-zinc-700">Estructura de Precios</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Oferta de entrada" hint="Precio y descripción del nivel básico o lead magnet de pago">
          <textarea
            rows={4}
            className={textareaClass}
            placeholder="Ej: Mini-curso $97&#10;Acceso básico a la comunidad&#10;Consulta inicial 30 min..."
            value={pricingEntry}
            onChange={e => setPricingEntry(e.target.value)}
          />
        </Field>

        <Field label="Oferta core" hint="El producto o servicio principal — el centro del funnel">
          <textarea
            rows={4}
            className={textareaClass}
            placeholder="Ej: Programa completo $1,500&#10;Acompañamiento 3 meses&#10;Acceso total a contenidos..."
            value={pricingCore}
            onChange={e => setPricingCore(e.target.value)}
          />
        </Field>

        <Field label="Oferta premium" hint="El nivel más alto — para los clientes que quieren más resultados">
          <textarea
            rows={4}
            className={textareaClass}
            placeholder="Ej: VIP Intensivo $5,000&#10;Trabajo 1:1 por 6 meses&#10;Acceso ilimitado + comunidad privada..."
            value={pricingPremium}
            onChange={e => setPricingPremium(e.target.value)}
          />
        </Field>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition"
        >
          {saving ? 'Guardando…' : 'Guardar Funnel'}
        </button>
      </div>
    </div>
  )
}
