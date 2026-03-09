'use client'
import { useEffect, useState, useRef } from 'react'

interface ChecklistItem { id: string; key: string; label: string; completed: boolean; notes: string }
interface Asset { id: string; type: string; label: string; filePath: string; fileSize: number; uploadedAt: string }

export default function TabChecklist({ sessionId }: { sessionId: string }) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const res = await fetch(`/api/sessions/${sessionId}/checklist`)
    if (res.ok) { const d = await res.json(); setItems(d.items); setAssets(d.assets) }
  }

  useEffect(() => { load() }, [sessionId])

  async function toggle(key: string, completed: boolean) {
    setItems(prev => prev.map(i => i.key === key ? { ...i, completed } : i))
    await fetch(`/api/sessions/${sessionId}/checklist`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, completed }),
    })
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    await fetch(`/api/sessions/${sessionId}/assets`, { method: 'POST', body: formData })
    await load()
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const done = items.filter(i => i.completed).length
  const pct = items.length ? Math.round((done / items.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-zinc-900">Progreso del checklist</p>
          <span className="text-sm font-bold text-zinc-900">{pct}%</span>
        </div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-zinc-900 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-zinc-400 mt-2">{done} de {items.length} completados</p>
      </div>

      {/* Checklist items */}
      <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-50">
          <p className="text-sm font-semibold text-zinc-900">Items requeridos</p>
        </div>
        <div className="divide-y divide-zinc-50">
          {items.map(item => (
            <label key={item.key} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 cursor-pointer">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={e => toggle(item.key, e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
              />
              <span className={`text-sm ${item.completed ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                {item.label}
              </span>
              {item.completed && <span className="ml-auto text-xs text-green-600 font-medium">✓</span>}
            </label>
          ))}
        </div>
      </div>

      {/* File uploads */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-zinc-900">Archivos del cliente</p>
          <label className="cursor-pointer bg-zinc-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition">
            {uploading ? 'Subiendo...' : '+ Subir archivo'}
            <input ref={fileRef} type="file" className="hidden" onChange={uploadFile} disabled={uploading}
              accept="image/*,.pdf,.zip,.ttf,.otf,.woff,.woff2" />
          </label>
        </div>

        {assets.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-6">No hay archivos subidos aún.</p>
        ) : (
          <div className="space-y-2">
            {assets.map(asset => (
              <div key={asset.id} className="flex items-center justify-between bg-zinc-50 rounded-lg px-4 py-3">
                <div>
                  <a href={asset.filePath} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-zinc-800 hover:text-zinc-900 underline">
                    {asset.label}
                  </a>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {asset.type} · {(asset.fileSize / 1024).toFixed(0)} KB ·{' '}
                    {new Date(asset.uploadedAt).toLocaleDateString('es-CO')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
