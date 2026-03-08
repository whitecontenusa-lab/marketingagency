'use client'
import { useState } from 'react'
import { ProgressBar } from './ProgressBar'
import { getText } from '@/lib/i18n'
import type { StepProps } from './types'

interface Value {
  id: string
  name: string
  description: string
}

interface NeverItem {
  id: string
  text: string
}

function parseValues(raw: string): Value[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((v: { name?: string; description?: string }) => ({
        id: crypto.randomUUID(),
        name: v.name ?? '',
        description: v.description ?? '',
      }))
    }
  } catch {
    // fall through
  }
  return []
}

function parseNeverList(raw: string): NeverItem[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((text: string) => ({ id: crypto.randomUUID(), text: String(text) }))
    }
  } catch {
    // fall through
  }
  return []
}

export function StepSoul({ lang, session, saving, onNext, onBack, step, total }: StepProps) {
  const [purpose, setPurpose] = useState(String(session.purpose ?? ''))
  const [values, setValues] = useState<Value[]>(() => parseValues(String(session.values ?? '')))
  const [neverList, setNeverList] = useState<NeverItem[]>(() => parseNeverList(String(session.neverList ?? '')))

  function addValue() {
    if (values.length >= 4) return
    setValues(prev => [...prev, { id: crypto.randomUUID(), name: '', description: '' }])
  }

  function updateValue(id: string, field: 'name' | 'description', val: string) {
    setValues(prev => prev.map(v => v.id === id ? { ...v, [field]: val } : v))
  }

  function removeValue(id: string) {
    setValues(prev => prev.filter(v => v.id !== id))
  }

  function addNever() {
    if (neverList.length >= 3) return
    setNeverList(prev => [...prev, { id: crypto.randomUUID(), text: '' }])
  }

  function updateNever(id: string, val: string) {
    setNeverList(prev => prev.map(n => n.id === id ? { ...n, text: val } : n))
  }

  function removeNever(id: string) {
    setNeverList(prev => prev.filter(n => n.id !== id))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext({
      purpose,
      values: JSON.stringify(values.filter(v => v.name.trim()).map(({ name, description }) => ({ name, description }))),
      neverList: JSON.stringify(neverList.map(n => n.text).filter(t => t.trim())),
    })
  }

  return (
    <div>
      <ProgressBar step={step} total={total} lang={lang} />
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">{getText(lang, 'step3Title')}</h1>
      <p className="text-sm text-zinc-500 mb-6">{getText(lang, 'step3Subtitle')}</p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">{getText(lang, 'purpose')}</label>
          <p className="text-xs text-zinc-400 mb-2">{getText(lang, 'purposeHint')}</p>
          <textarea
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            rows={4}
            required
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">{getText(lang, 'values')}</label>
          <p className="text-xs text-zinc-400 mb-2">{getText(lang, 'valuesHint')}</p>
          <div className="space-y-3">
            {values.map(v => (
              <div key={v.id} className="border border-zinc-200 rounded-xl p-4 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={v.name}
                    onChange={e => updateValue(v.id, 'name', e.target.value)}
                    placeholder={getText(lang, 'valueName')}
                    className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <button
                    type="button"
                    onClick={() => removeValue(v.id)}
                    className="text-zinc-400 hover:text-zinc-700 px-2 text-lg leading-none"
                    aria-label="Remove value"
                  >
                    &times;
                  </button>
                </div>
                <input
                  type="text"
                  value={v.description}
                  onChange={e => updateValue(v.id, 'description', e.target.value)}
                  placeholder={getText(lang, 'valueDescription')}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
            ))}
            {values.length < 4 && (
              <button
                type="button"
                onClick={addValue}
                className="text-sm text-zinc-500 hover:text-zinc-900 transition"
              >
                {getText(lang, 'addValue')}
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">{getText(lang, 'neverList')}</label>
          <p className="text-xs text-zinc-400 mb-2">{getText(lang, 'neverListHint')}</p>
          <div className="space-y-2">
            {neverList.map(item => (
              <div key={item.id} className="flex gap-2">
                <input
                  type="text"
                  value={item.text}
                  onChange={e => updateNever(item.id, e.target.value)}
                  className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
                <button
                  type="button"
                  onClick={() => removeNever(item.id)}
                  className="text-zinc-400 hover:text-zinc-700 px-2 text-lg leading-none"
                  aria-label="Remove item"
                >
                  &times;
                </button>
              </div>
            ))}
            {neverList.length < 3 && (
              <button
                type="button"
                onClick={addNever}
                className="text-sm text-zinc-500 hover:text-zinc-900 transition"
              >
                {getText(lang, 'addNever')}
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            disabled={saving}
            className="flex-1 border border-zinc-200 text-zinc-700 px-6 py-3 rounded-xl font-medium hover:bg-zinc-50 transition disabled:opacity-50"
          >
            {getText(lang, 'back')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-zinc-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-zinc-700 transition disabled:opacity-50"
          >
            {saving ? getText(lang, 'saving') : getText(lang, 'next')}
          </button>
        </div>
      </form>
    </div>
  )
}
