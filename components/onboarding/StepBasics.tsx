'use client'
import { useState } from 'react'
import { ProgressBar } from './ProgressBar'
import { getText, t } from '@/lib/i18n'
import type { StepProps } from './types'

const CHANNEL_KEYS = ['instagram', 'tiktok', 'youtube', 'email', 'linkedin', 'facebook', 'twitter', 'other'] as const

export function StepBasics({ lang, session, saving, onNext, onBack, step, total }: StepProps) {
  const [clientName, setClientName] = useState(session.clientName ?? '')
  const [brandName, setBrandName] = useState(session.brandName ?? '')
  const [industry, setIndustry] = useState(session.industry ?? '')
  const [country, setCountry] = useState(session.country ?? '')
  const [email, setEmail] = useState(session.email ?? '')
  const [whatsapp, setWhatsapp] = useState(session.whatsapp ?? '')

  // channels is a comma-separated list stored as a string
  const initialChannels = session.channels
    ? String(session.channels).split(',').filter(Boolean)
    : []
  const [selectedChannels, setSelectedChannels] = useState<string[]>(initialChannels)

  function toggleChannel(key: string) {
    setSelectedChannels(prev =>
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext({
      clientName,
      brandName,
      industry,
      country,
      email,
      whatsapp,
      channels: selectedChannels.join(','),
    })
  }

  const channelLabels = t[lang].channels

  return (
    <div>
      <ProgressBar step={step} total={total} lang={lang} />
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">{getText(lang, 'step2Title')}</h1>
      <p className="text-sm text-zinc-500 mb-6">{getText(lang, 'step2Subtitle')}</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">{getText(lang, 'fullName')}</label>
          <input
            type="text"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            required
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">{getText(lang, 'brandName')}</label>
          <input
            type="text"
            value={brandName}
            onChange={e => setBrandName(e.target.value)}
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
          <p className="text-xs text-zinc-400 mt-1">{getText(lang, 'brandNameHint')}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">{getText(lang, 'industry')}</label>
          <input
            type="text"
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            required
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
          <p className="text-xs text-zinc-400 mt-1">{getText(lang, 'industryHint')}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">{getText(lang, 'country')}</label>
          <input
            type="text"
            value={country}
            onChange={e => setCountry(e.target.value)}
            required
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">{getText(lang, 'activeChannels')}</label>
          <p className="text-xs text-zinc-400 mb-2">{getText(lang, 'activeChannelsHint')}</p>
          <div className="flex flex-wrap gap-2">
            {CHANNEL_KEYS.map(key => (
              <button
                key={key}
                type="button"
                onClick={() => toggleChannel(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  selectedChannels.includes(key)
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                }`}
              >
                {channelLabels[key]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">{getText(lang, 'email')}</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">{getText(lang, 'whatsapp')}</label>
          <input
            type="text"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            placeholder="+1234567890"
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
          <p className="text-xs text-zinc-400 mt-1">{getText(lang, 'whatsappHint')}</p>
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
