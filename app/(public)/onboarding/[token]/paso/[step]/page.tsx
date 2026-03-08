'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Lang } from '@/lib/i18n'
import { StepWelcome } from '@/components/onboarding/StepWelcome'
import { StepBasics } from '@/components/onboarding/StepBasics'
import { StepBusiness } from '@/components/onboarding/StepBusiness'
import { StepSoul } from '@/components/onboarding/StepSoul'
import { StepAudience } from '@/components/onboarding/StepAudience'
import { StepVision } from '@/components/onboarding/StepVision'

const TOTAL_STEPS = 6

export default function StepPage() {
  const { token, step } = useParams<{ token: string; step: string }>()
  const router = useRouter()
  const stepNum = parseInt(step)
  const [session, setSession] = useState<Record<string, string | number | null> | null>(null)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  const lang: Lang = (session?.language as Lang) ?? 'es'

  useEffect(() => {
    fetch(`/api/onboarding/${token}`)
      .then(r => {
        if (!r.ok) throw new Error('invalid')
        return r.json()
      })
      .then(setSession)
      .catch(() => router.push(`/onboarding/${token}`))
  }, [token, router])

  const save = useCallback(async (data: Record<string, unknown>) => {
    setSaving(true)
    setSaveError('')
    try {
      const r = await fetch(`/api/onboarding/${token}/save`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!r.ok) throw new Error(`Save failed: ${r.status}`)
    } finally {
      setSaving(false)
    }
  }, [token])

  const goNext = useCallback(async (data: Record<string, unknown>) => {
    try {
      await save(data)
      if (stepNum === TOTAL_STEPS) {
        const r = await fetch(`/api/onboarding/${token}/complete`, { method: 'POST' })
        if (!r.ok) throw new Error('Complete failed')
        router.push(`/onboarding/${token}/gracias`)
      } else {
        router.push(`/onboarding/${token}/paso/${stepNum + 1}`)
      }
    } catch {
      setSaveError(lang === 'en' ? 'Error saving. Please try again.' : 'Error al guardar. Intenta de nuevo.')
    }
  }, [save, stepNum, token, router, lang])

  const goBack = useCallback(() => {
    if (stepNum <= 1) router.push(`/onboarding/${token}`)
    else router.push(`/onboarding/${token}/paso/${stepNum - 1}`)
  }, [stepNum, token, router])

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
    </div>
  )

  const props = { lang, session, saving, onNext: goNext, onBack: goBack, step: stepNum, total: TOTAL_STEPS }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-lg mx-auto px-6 py-10">
        {saveError && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3">{saveError}</div>
        )}
        {stepNum === 1 && <StepWelcome {...props} />}
        {stepNum === 2 && <StepBasics {...props} />}
        {stepNum === 3 && <StepSoul {...props} />}
        {stepNum === 4 && <StepAudience {...props} />}
        {stepNum === 5 && <StepBusiness {...props} />}
        {stepNum === 6 && <StepVision {...props} />}
      </div>
    </div>
  )
}
