'use client'
import { useState, useEffect } from 'react'

export function DeliveryCountdown({ deliveredAt, lang }: { deliveredAt: string; lang: 'es' | 'en' }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    function update() {
      const diff = new Date(deliveredAt).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining(lang === 'en' ? 'Ready! Refresh the page.' : 'Lista. Recarga la página.')
        return
      }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      setRemaining(lang === 'en' ? `${h}h ${m}min` : `${h}h ${m}min`)
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [deliveredAt, lang])

  return (
    <div className="text-center py-16 px-6">
      <div className="text-5xl mb-6">⏳</div>
      <h3 className="text-xl font-semibold text-zinc-100 mb-2">
        {lang === 'en' ? 'Your strategy is being finalized' : 'Tu estrategia está siendo finalizada'}
      </h3>
      <p className="text-zinc-400 mb-6">
        {lang === 'en'
          ? 'We are making the final touches. It will be ready in:'
          : 'Estamos dando los últimos toques. Estará lista en:'}
      </p>
      <div className="inline-block bg-zinc-800 rounded-xl px-8 py-4">
        <span className="text-3xl font-mono font-bold text-white">{remaining}</span>
      </div>
    </div>
  )
}
