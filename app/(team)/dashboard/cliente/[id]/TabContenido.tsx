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

export function TabContenido({ data, onSave }: TabProps) {
  const profile = (data.client as Record<string, unknown> | null)?.profile as Record<string, unknown> | null

  const [contentEmotion, setContentEmotion] = useState((profile?.contentEmotion as string) ?? '')
  const [contentTransformation, setContentTransformation] = useState((profile?.contentTransformation as string) ?? '')
  const [contentPillars, setContentPillars] = useState((profile?.contentPillars as string) ?? '')
  const [voiceAdjectives, setVoiceAdjectives] = useState((profile?.voiceAdjectives as string) ?? '')
  const [voiceVocabulary, setVoiceVocabulary] = useState((profile?.voiceVocabulary as string) ?? '')
  const [voiceForbidden, setVoiceForbidden] = useState((profile?.voiceForbidden as string) ?? '')
  const [toneByContext, setToneByContext] = useState((profile?.toneByContext as string) ?? '')
  const [channelFormats, setChannelFormats] = useState((profile?.channelFormats as string) ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave({
      contentEmotion,
      contentTransformation,
      contentPillars,
      voiceAdjectives,
      voiceVocabulary,
      voiceForbidden,
      toneByContext,
      channelFormats,
    })
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-6">
      <h2 className="text-lg font-semibold text-zinc-900">Estrategia de Contenido</h2>

      <div className="grid grid-cols-1 gap-5">
        <Field label="Emoción principal del contenido" hint="¿Qué emoción busca evocar el contenido en la audiencia?">
          <textarea
            rows={2}
            className={textareaClass}
            placeholder="Ej: Esperanza, urgencia, curiosidad, inspiración..."
            value={contentEmotion}
            onChange={e => setContentEmotion(e.target.value)}
          />
        </Field>

        <Field label="Transformación prometida" hint="¿De dónde a dónde lleva el contenido al lector?">
          <textarea
            rows={3}
            className={textareaClass}
            placeholder="De [estado actual] a [estado deseado] mediante [mecanismo]..."
            value={contentTransformation}
            onChange={e => setContentTransformation(e.target.value)}
          />
        </Field>

        <Field label="Pilares de contenido" hint="Los 3-5 temas principales que estructuran todo el contenido (separados por coma o salto de línea)">
          <textarea
            rows={4}
            className={textareaClass}
            placeholder="1. Autoridad / Educación&#10;2. Prueba social / Casos&#10;3. Transformación / Resultados&#10;..."
            value={contentPillars}
            onChange={e => setContentPillars(e.target.value)}
          />
        </Field>
      </div>

      <hr className="border-zinc-100" />
      <h3 className="text-sm font-semibold text-zinc-700">Voz y Tono</h3>

      <div className="grid grid-cols-1 gap-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Adjetivos de voz" hint="3-5 palabras que definen el tono">
            <input
              type="text"
              className={inputClass}
              placeholder="Ej: Directo, cálido, experto, cercano..."
              value={voiceAdjectives}
              onChange={e => setVoiceAdjectives(e.target.value)}
            />
          </Field>
          <Field label="Vocabulario característico" hint="Palabras y frases que se deben usar">
            <input
              type="text"
              className={inputClass}
              placeholder="Ej: transformar, resultado real, sistema..."
              value={voiceVocabulary}
              onChange={e => setVoiceVocabulary(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Vocabulario prohibido" hint="Palabras, frases o temas a evitar absolutamente">
          <textarea
            rows={2}
            className={textareaClass}
            placeholder="Ej: 'fácil dinero', 'hacerse rico', jerga técnica innecesaria..."
            value={voiceForbidden}
            onChange={e => setVoiceForbidden(e.target.value)}
          />
        </Field>

        <Field label="Tono por contexto" hint="Cómo varía el tono según el canal o momento del funnel">
          <textarea
            rows={3}
            className={textareaClass}
            placeholder="Instagram: inspiracional y visual&#10;Email: directo y personal&#10;WhatsApp: cercano y conversacional..."
            value={toneByContext}
            onChange={e => setToneByContext(e.target.value)}
          />
        </Field>

        <Field label="Formatos por canal" hint="Qué tipo de contenido se produce en cada plataforma">
          <textarea
            rows={3}
            className={textareaClass}
            placeholder="Instagram: Reels educativos + carruseles&#10;LinkedIn: Artículos de autoridad&#10;Email: Newsletter semanal..."
            value={channelFormats}
            onChange={e => setChannelFormats(e.target.value)}
          />
        </Field>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition"
        >
          {saving ? 'Guardando…' : 'Guardar Contenido'}
        </button>
      </div>
    </div>
  )
}
