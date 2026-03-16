'use client'
import { useEffect, useState, useRef } from 'react'

interface ContentPiece {
  id: string
  platform: string
  format: string
  hook: string
  body: string
  cta: string
  hashtags: string
  funnelStage: string
  week: number
  status: string
  scheduledAt: string | null
  releasedAt: string | null
  cycleId: string | null
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-500',
  tiktok: 'bg-zinc-800',
  facebook: 'bg-blue-500',
  linkedin: 'bg-sky-600',
  youtube: 'bg-red-500',
  threads: 'bg-zinc-600',
  pinterest: 'bg-red-600',
  x: 'bg-zinc-700',
  email: 'bg-amber-500',
  blog: 'bg-green-500',
}

const FUNNEL_COLORS: Record<string, string> = {
  tofu: 'border-l-emerald-400',
  mofu: 'border-l-amber-400',
  bofu: 'border-l-rose-400',
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Borrador',   cls: 'bg-zinc-100 text-zinc-600' },
  ready:     { label: 'Listo',      cls: 'bg-blue-50 text-blue-700' },
  scheduled: { label: 'Programado', cls: 'bg-amber-50 text-amber-700' },
  published: { label: 'Publicado',  cls: 'bg-green-50 text-green-700' },
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function formatMonthYear(year: number, month: number) {
  return new Date(year, month).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
}

export default function TabCalendarioDash({ sessionId }: { sessionId: string }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [pieces, setPieces] = useState<ContentPiece[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ContentPiece | null>(null)
  const [editDate, setEditDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`/api/sessions/${sessionId}/content`)
      if (r.ok) setPieces(await r.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [sessionId])

  // Build date map for calendar
  const piecesByDate: Record<string, ContentPiece[]> = {}
  for (const p of pieces) {
    const ds = p.scheduledAt ?? p.releasedAt
    if (!ds) continue
    const d = new Date(ds)
    if (d.getFullYear() !== year || d.getMonth() !== month) continue
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!piecesByDate[key]) piecesByDate[key] = []
    piecesByDate[key].push(p)
  }

  const unscheduled = pieces.filter(p => !p.scheduledAt && !p.releasedAt)

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const calDays: Array<number | null> = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d)
  while (calDays.length % 7 !== 0) calDays.push(null)

  function openPiece(p: ContentPiece) {
    setSelected(p)
    const ds = p.scheduledAt ?? p.releasedAt
    setEditDate(ds ? new Date(ds).toISOString().slice(0, 10) : '')
    setSaveMsg('')
  }

  async function saveSchedule() {
    if (!selected) return
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch(`/api/sessions/${sessionId}/content/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: editDate ? new Date(editDate).toISOString() : null }),
      })
      if (res.ok) {
        setSaveMsg('Guardado')
        await load()
        // update selected piece from refreshed list
        setSelected(prev => prev ? { ...prev, scheduledAt: editDate ? new Date(editDate).toISOString() : null } : null)
      } else {
        setSaveMsg('Error al guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  const DAY_HEADERS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  return (
    <div>
      {/* Piece modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div ref={modalRef} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-white text-xs font-bold px-2 py-1 rounded-full ${PLATFORM_COLORS[selected.platform] ?? 'bg-zinc-500'}`}>{selected.platform}</span>
              <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full">{selected.format}</span>
              {selected.funnelStage && (
                <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full">{selected.funnelStage.toUpperCase()}</span>
              )}
              <span className={`text-xs px-2 py-1 rounded-full ml-auto ${STATUS_LABELS[selected.status]?.cls ?? 'bg-zinc-100 text-zinc-500'}`}>
                {STATUS_LABELS[selected.status]?.label ?? selected.status}
              </span>
              <button onClick={() => setSelected(null)} className="text-zinc-400 hover:text-zinc-700 text-lg leading-none ml-1">×</button>
            </div>
            <p className="font-semibold text-zinc-900 mb-2 leading-snug">{selected.hook}</p>
            <p className="text-sm text-zinc-600 leading-relaxed mb-3">{selected.body}</p>
            {selected.cta && <p className="text-xs text-zinc-500 italic border-l-2 border-zinc-200 pl-2 mb-3">{selected.cta}</p>}
            {selected.hashtags && <p className="text-xs text-zinc-400 mb-4">{selected.hashtags}</p>}

            {/* Schedule date picker */}
            <div className="border-t border-zinc-100 pt-4">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Fecha programada</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="flex-1 text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
                <button
                  onClick={saveSchedule}
                  disabled={saving}
                  className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-zinc-700 transition disabled:opacity-50 font-medium"
                >
                  {saving ? '...' : 'Guardar'}
                </button>
              </div>
              {saveMsg && (
                <p className={`text-xs mt-1.5 ${saveMsg === 'Guardado' ? 'text-green-600' : 'text-red-500'}`}>{saveMsg}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-zinc-100 text-sm transition">← Anterior</button>
          <h2 className="font-bold text-zinc-900 text-lg capitalize min-w-[180px] text-center">
            {formatMonthYear(year, month)}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-zinc-100 text-sm transition">Siguiente →</button>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />TOFU</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />MOFU</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />BOFU</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_HEADERS.map(h => (
              <div key={h} className="text-center text-xs font-semibold text-zinc-400 py-2">{h}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-zinc-200 rounded-xl overflow-hidden border border-zinc-200 mb-6">
            {calDays.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} className="bg-zinc-50 min-h-[90px]" />
              const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayPieces = piecesByDate[key] ?? []
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              return (
                <div key={key} className={`bg-white min-h-[90px] p-1.5 ${isToday ? 'ring-2 ring-inset ring-zinc-900' : ''}`}>
                  <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-zinc-900 text-white' : 'text-zinc-500'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayPieces.slice(0, 3).map(p => (
                      <button
                        key={p.id}
                        onClick={() => openPiece(p)}
                        className={`w-full text-left text-[10px] leading-tight p-1 rounded border-l-2 ${FUNNEL_COLORS[p.funnelStage] ?? 'border-l-zinc-300'} bg-zinc-50 hover:bg-zinc-100 transition truncate`}
                      >
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${PLATFORM_COLORS[p.platform] ?? 'bg-zinc-400'}`} />
                        {p.hook.slice(0, 28)}
                      </button>
                    ))}
                    {dayPieces.length > 3 && (
                      <p className="text-[10px] text-zinc-400 pl-1">+{dayPieces.length - 3}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Unscheduled pieces */}
          {unscheduled.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-700 mb-3">
                Sin fecha programada ({unscheduled.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {unscheduled.map(p => (
                  <button
                    key={p.id}
                    onClick={() => openPiece(p)}
                    className={`text-left bg-white rounded-xl border border-zinc-100 p-3 border-l-4 ${FUNNEL_COLORS[p.funnelStage] ?? 'border-l-zinc-200'} hover:shadow-sm transition`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-white text-xs px-1.5 py-0.5 rounded-full ${PLATFORM_COLORS[p.platform] ?? 'bg-zinc-500'}`}>{p.platform}</span>
                      <span className="text-xs text-zinc-400">{p.format}</span>
                      <span className="text-xs text-zinc-400 ml-auto">Sem. {p.week}</span>
                    </div>
                    <p className="text-xs text-zinc-700 truncate">{p.hook}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
