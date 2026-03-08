'use client'
import { useState } from 'react'

interface TabProps {
  data: Record<string, unknown>
  onSave: (fields: Record<string, unknown>) => Promise<void>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

const textareaClass =
  'w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-none'

const inputClass =
  'w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent'

export function TabPerfil({ data, onSave }: TabProps) {
  const profile = (data.client as Record<string, unknown> | null)?.profile as Record<string, unknown> | null

  const [icpMicrosegment, setIcpMicrosegment] = useState((profile?.icpMicrosegment as string) ?? '')
  const [icpInternalDialogue, setIcpInternalDialogue] = useState((profile?.icpInternalDialogue as string) ?? '')
  const [icpDeepPain, setIcpDeepPain] = useState((profile?.icpDeepPain as string) ?? '')
  const [icpDeepDesire, setIcpDeepDesire] = useState((profile?.icpDeepDesire as string) ?? '')
  const [icpObjection, setIcpObjection] = useState((profile?.icpObjection as string) ?? '')
  const [icpCounterargument, setIcpCounterargument] = useState((profile?.icpCounterargument as string) ?? '')
  const [emotionalArchetype, setEmotionalArchetype] = useState((profile?.emotionalArchetype as string) ?? '')
  const [emotionalArchetypeDesc, setEmotionalArchetypeDesc] = useState((profile?.emotionalArchetypeDesc as string) ?? '')
  const [audienceArchetype, setAudienceArchetype] = useState((profile?.audienceArchetype as string) ?? '')
  const [audienceArchetypeDesc, setAudienceArchetypeDesc] = useState((profile?.audienceArchetypeDesc as string) ?? '')
  const [archetypeRelationship, setArchetypeRelationship] = useState((profile?.archetypeRelationship as string) ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave({
      icpMicrosegment,
      icpInternalDialogue,
      icpDeepPain,
      icpDeepDesire,
      icpObjection,
      icpCounterargument,
      emotionalArchetype,
      emotionalArchetypeDesc,
      audienceArchetype,
      audienceArchetypeDesc,
      archetypeRelationship,
    })
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-6">
      <h2 className="text-lg font-semibold text-zinc-900">Perfil Profundo del ICP</h2>

      <div className="grid grid-cols-1 gap-5">
        <Field label="Microsegmento específico">
          <textarea
            rows={3}
            className={textareaClass}
            placeholder="Describe el microsegmento exacto del cliente ideal..."
            value={icpMicrosegment}
            onChange={e => setIcpMicrosegment(e.target.value)}
          />
        </Field>

        <Field label="Diálogo interno del ICP">
          <textarea
            rows={3}
            className={textareaClass}
            placeholder="¿Qué se dice el ICP a sí mismo antes de dormir?..."
            value={icpInternalDialogue}
            onChange={e => setIcpInternalDialogue(e.target.value)}
          />
        </Field>

        <Field label="Dolor profundo (nivel 3)">
          <textarea
            rows={3}
            className={textareaClass}
            placeholder="El dolor más profundo detrás de los síntomas superficiales..."
            value={icpDeepPain}
            onChange={e => setIcpDeepPain(e.target.value)}
          />
        </Field>

        <Field label="Deseo profundo">
          <textarea
            rows={3}
            className={textareaClass}
            placeholder="Lo que el ICP realmente desea en el fondo..."
            value={icpDeepDesire}
            onChange={e => setIcpDeepDesire(e.target.value)}
          />
        </Field>

        <Field label="Objeción principal">
          <textarea
            rows={2}
            className={textareaClass}
            placeholder="La mayor objeción que frena al ICP..."
            value={icpObjection}
            onChange={e => setIcpObjection(e.target.value)}
          />
        </Field>

        <Field label="Contraargumento / Manejo de objeción">
          <textarea
            rows={2}
            className={textareaClass}
            placeholder="Cómo se aborda y desarma esa objeción..."
            value={icpCounterargument}
            onChange={e => setIcpCounterargument(e.target.value)}
          />
        </Field>
      </div>

      <hr className="border-zinc-100" />
      <h3 className="text-sm font-semibold text-zinc-700">Arquetipos de Marca</h3>

      <div className="grid grid-cols-1 gap-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Arquetipo emocional de la marca">
            <input
              type="text"
              className={inputClass}
              placeholder="Ej: El Héroe, El Sabio..."
              value={emotionalArchetype}
              onChange={e => setEmotionalArchetype(e.target.value)}
            />
          </Field>
          <Field label="Descripción del arquetipo emocional">
            <input
              type="text"
              className={inputClass}
              placeholder="Cómo se manifiesta..."
              value={emotionalArchetypeDesc}
              onChange={e => setEmotionalArchetypeDesc(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Arquetipo de la audiencia">
            <input
              type="text"
              className={inputClass}
              placeholder="Ej: El Explorador, El Rebelde..."
              value={audienceArchetype}
              onChange={e => setAudienceArchetype(e.target.value)}
            />
          </Field>
          <Field label="Descripción del arquetipo de audiencia">
            <input
              type="text"
              className={inputClass}
              placeholder="Cómo se manifiesta..."
              value={audienceArchetypeDesc}
              onChange={e => setAudienceArchetypeDesc(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Relación entre arquetipos">
          <textarea
            rows={2}
            className={textareaClass}
            placeholder="Cómo interactúan el arquetipo de la marca y el de la audiencia..."
            value={archetypeRelationship}
            onChange={e => setArchetypeRelationship(e.target.value)}
          />
        </Field>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition"
        >
          {saving ? 'Guardando…' : 'Guardar Perfil'}
        </button>
      </div>
    </div>
  )
}
