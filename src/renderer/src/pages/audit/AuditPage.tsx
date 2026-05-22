import { useEffect, useState } from 'react'
import type { AuditLogEntry, AuditLogPage } from '../../../../shared/types'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function getErrorMessage(error: string) {
  switch (error) {
    case 'forbidden':
      return 'Solo admin puede revisar la auditoría.'
    case 'unauthorized':
      return 'La sesión expiró. Volvé a iniciar sesión.'
    default:
      return 'No pudimos cargar el log de auditoría.'
  }
}

function payloadPreview(payload: AuditLogEntry['payload']) {
  return typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
}

export function AuditPage() {
  const [pageData, setPageData] = useState<AuditLogPage | null>(null)
  const [page, setPage] = useState(1)
  const [userId, setUserId] = useState('all')
  const [action, setAction] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadData(nextPage = page) {
    setLoading(true)
    setError(null)

    const response = await window.api.audit.list({
      page: nextPage,
      pageSize: 20,
      userId: userId === 'all' ? null : Number(userId),
      action: action === 'all' ? null : action,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      setLoading(false)
      return
    }

    setPageData(response.data)
    setLoading(false)
  }

  useEffect(() => {
    void loadData(1)
    setPage(1)
  }, [userId, action, startDate, endDate])

  useEffect(() => {
    void loadData(page)
  }, [page])

  const totalPages = pageData ? Math.max(1, Math.ceil(pageData.total / pageData.pageSize)) : 1

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Fase 6</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Log de auditoría</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Trazabilidad real: quién hizo qué, cuándo y sobre qué entidad. Si hay un incidente, esto es lo primero que mirás.
        </p>
        {error ? <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="grid gap-3 md:grid-cols-4">
          <select value={userId} onChange={(event) => setUserId(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400">
            <option value="all">Todos los usuarios</option>
            {pageData?.users.map((user) => (
              <option key={user.id} value={user.id}>{user.name} (@{user.username})</option>
            ))}
          </select>
          <select value={action} onChange={(event) => setAction(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400">
            <option value="all">Todas las acciones</option>
            {pageData?.availableActions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" />
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white">Eventos</h3>
            <p className="mt-1 text-sm text-slate-400">Página {page} de {totalPages}. Total de registros: {pageData?.total ?? 0}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 disabled:opacity-40">
              Anterior
            </button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 disabled:opacity-40">
              Siguiente
            </button>
          </div>
        </div>

        {loading ? <p className="mt-5 text-sm text-slate-400">Cargando auditoría...</p> : null}

        <div className="mt-5 space-y-3">
          {!loading && !pageData?.items.length ? <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">No hay eventos para ese filtro.</p> : null}
          {pageData?.items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">{item.action}</span>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{item.entity}{item.entityId ? ` #${item.entityId}` : ''}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{item.user.name} (@{item.user.username})</p>
                  <p className="text-sm text-slate-400">{formatDate(item.createdAt)} · Terminal: {item.terminalId}</p>
                </div>
              </div>
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-300">{payloadPreview(item.payload)}</pre>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
