'use client'
import { useState } from 'react'

interface TabFinalizarProps {
  sessionId: string
  data: Record<string, unknown>
}

export function TabFinalizar({ sessionId, data }: TabFinalizarProps) {
  const profile = (
    (data.client as Record<string, unknown> | null)?.profile as Record<string, unknown> | null
  )

  const alreadyDone = (profile?.giteaFolderCreated as boolean) ?? false

  const [done, setDone] = useState(alreadyDone)
  const [repoUrl, setRepoUrl] = useState<string | null>(
    (profile?.giteaFolderPath as string) || null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleFinalize() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/clients/${sessionId}/finalize`, { method: 'POST' })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setError(body.error ?? 'Error al finalizar. Intenta de nuevo.')
        return
      }
      const body = (await res.json()) as { ok: boolean; repoUrl?: string; alreadyDone?: boolean }
      setDone(true)
      if (body.repoUrl) setRepoUrl(body.repoUrl)
    } catch {
      setError('Error de red. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Finalizar Cliente</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Crea el repositorio Gitea con el perfil completo del cliente.
        </p>
      </div>

      {done ? (
        <div className="rounded-xl border border-green-100 bg-green-50 p-5 flex items-start gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">Repositorio creado</p>
            <p className="text-xs text-green-600 mt-0.5">
              Los archivos de perfil han sido publicados en Gitea.
            </p>
            {repoUrl ? (
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-green-700 underline underline-offset-2 hover:text-green-900"
              >
                {repoUrl}
              </a>
            ) : (
              <p className="mt-2 text-xs text-green-500">URL no disponible — consulta Gitea directamente.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">
            Al hacer clic en el botón se creará un repositorio en Gitea con los archivos de perfil del cliente
            (ICP, arquetipos, contenido, funnel y diagnóstico).
          </p>

          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleFinalize}
            disabled={loading}
            className="px-6 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Creando repositorio…
              </span>
            ) : (
              'Crear repositorio en Gitea'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
