'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function QueueActions({ itemId, sessionId, type }: { itemId: string; sessionId: string | null; type: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)

  async function decide(status: 'approved' | 'rejected' | 'skipped') {
    setLoading(status)
    try {
      // If approving a strategy_review, also call the approve endpoint
      if (status === 'approved' && type === 'strategy_review' && sessionId) {
        await fetch(`/api/sessions/${sessionId}/approve`, { method: 'POST' })
      }
      await fetch('/api/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, status, decisionNote: note }),
      })
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2 flex-shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowNote(!showNote)}
          className="text-xs text-zinc-400 hover:text-zinc-700 px-2 py-1 border border-zinc-200 rounded-lg transition"
        >
          Nota
        </button>
        <button
          onClick={() => decide('rejected')}
          disabled={!!loading}
          className="text-xs font-medium text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition disabled:opacity-50"
        >
          {loading === 'rejected' ? '...' : 'Rechazar'}
        </button>
        <button
          onClick={() => decide('approved')}
          disabled={!!loading}
          className="text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
        >
          {loading === 'approved' ? '...' : type === 'strategy_review' ? 'Aprobar y publicar' : 'Aprobar'}
        </button>
      </div>
      {showNote && (
        <input
          type="text"
          placeholder="Nota de decisión (opcional)"
          value={note}
          onChange={e => setNote(e.target.value)}
          className="text-xs border border-zinc-200 rounded-lg px-3 py-1.5 w-64 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      )}
    </div>
  )
}
