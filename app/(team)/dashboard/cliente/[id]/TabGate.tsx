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

interface GateCheckProps {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}

function GateCheck({ id, label, description, checked, onChange }: GateCheckProps) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${
        checked ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-100 bg-white hover:border-zinc-200'
      }`}
    >
      <div className="flex-shrink-0 mt-0.5">
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
            checked ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300 bg-white'
          }`}
        >
          {checked && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-900">{label}</p>
        <p className="text-xs text-zinc-400 mt-0.5">{description}</p>
      </div>
    </label>
  )
}

const EMOTIONAL_STATES = [
  { value: 1, label: '1 — Muy bajo / En crisis' },
  { value: 2, label: '2 — Bajo / Inseguro' },
  { value: 3, label: '3 — Neutral / Estable' },
  { value: 4, label: '4 — Motivado / Con energía' },
  { value: 5, label: '5 — Excelente / Listo para crecer' },
]

export function TabGate({ data, onSave }: TabProps) {
  const profile = (data.client as Record<string, unknown> | null)?.profile as Record<string, unknown> | null

  const [gateCanDeliver, setGateCanDeliver] = useState((profile?.gateCanDeliver as boolean) ?? false)
  const [gateGenuinePurpose, setGateGenuinePurpose] = useState((profile?.gateGenuinePurpose as boolean) ?? false)
  const [gateAutoServesPurpose, setGateAutoServesPurpose] = useState((profile?.gateAutoServesPurpose as boolean) ?? false)
  const [gateMeasurableResults, setGateMeasurableResults] = useState((profile?.gateMeasurableResults as boolean) ?? false)
  const [gateResult, setGateResult] = useState((profile?.gateResult as string) ?? '')
  const [gateDiagnosisNotes, setGateDiagnosisNotes] = useState((profile?.gateDiagnosisNotes as string) ?? '')
  const [initialEmotionalState, setInitialEmotionalState] = useState<number>((profile?.initialEmotionalState as number) ?? 3)
  const [saving, setSaving] = useState(false)

  const allGatesPassed = gateCanDeliver && gateGenuinePurpose && gateAutoServesPurpose && gateMeasurableResults

  async function handleSave() {
    setSaving(true)
    await onSave({
      gateCanDeliver,
      gateGenuinePurpose,
      gateAutoServesPurpose,
      gateMeasurableResults,
      gateResult,
      gateDiagnosisNotes,
      initialEmotionalState,
    })
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Gate Filosófico</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Evaluación interna antes de proceder con el onboarding. El cliente debe cumplir los 4 criterios.
          </p>
        </div>
        {allGatesPassed ? (
          <span className="flex-shrink-0 text-xs bg-green-50 text-green-700 border border-green-100 px-3 py-1.5 rounded-full font-medium">
            Gate aprobado
          </span>
        ) : (
          <span className="flex-shrink-0 text-xs bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1.5 rounded-full font-medium">
            Pendiente
          </span>
        )}
      </div>

      <div className="space-y-3">
        <GateCheck
          id="gate-can-deliver"
          label="Puede entregar resultados reales"
          description="La agencia puede cumplir lo que promete — tiene capacidad técnica, tiempo y recursos."
          checked={gateCanDeliver}
          onChange={setGateCanDeliver}
        />
        <GateCheck
          id="gate-genuine-purpose"
          label="Tiene un propósito genuino"
          description="El cliente tiene una razón real para existir más allá del dinero — hay una misión auténtica."
          checked={gateGenuinePurpose}
          onChange={setGateGenuinePurpose}
        />
        <GateCheck
          id="gate-auto-serves"
          label="La automatización sirve al propósito"
          description="La estrategia digital amplifica el propósito real — no lo contradice ni lo vacía."
          checked={gateAutoServesPurpose}
          onChange={setGateAutoServesPurpose}
        />
        <GateCheck
          id="gate-measurable"
          label="Los resultados son medibles"
          description="Existen métricas claras de éxito que podremos rastrear durante el acompañamiento."
          checked={gateMeasurableResults}
          onChange={setGateMeasurableResults}
        />
      </div>

      <hr className="border-zinc-100" />

      <div className="grid grid-cols-1 gap-5">
        <Field label="Resultado del gate" hint="¿Cuál es la decisión final? ¿Se aprueba, se condiciona o se rechaza?">
          <textarea
            rows={2}
            className={textareaClass}
            placeholder="Ej: Aprobado con condición de clarificar propósito en sesión inicial..."
            value={gateResult}
            onChange={e => setGateResult(e.target.value)}
          />
        </Field>

        <Field label="Notas de diagnóstico" hint="Observaciones internas del equipo sobre el cliente, su situación y riesgos detectados">
          <textarea
            rows={4}
            className={textareaClass}
            placeholder="Notas privadas del equipo: contexto adicional, señales de alerta, oportunidades específicas, cómo abordar la primera sesión..."
            value={gateDiagnosisNotes}
            onChange={e => setGateDiagnosisNotes(e.target.value)}
          />
        </Field>

        <Field label="Estado emocional inicial del cliente" hint="Evaluación del equipo basada en el formulario y la entrevista">
          <select
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            value={initialEmotionalState}
            onChange={e => setInitialEmotionalState(Number(e.target.value))}
          >
            {EMOTIONAL_STATES.map(es => (
              <option key={es.value} value={es.value}>{es.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition"
        >
          {saving ? 'Guardando…' : 'Guardar Gate'}
        </button>
      </div>
    </div>
  )
}
