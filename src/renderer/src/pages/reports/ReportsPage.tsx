import { useEffect, useMemo, useState } from 'react'
import type { Category, Offer, Product, ReportPeriod, SalesReport } from '../../../../shared/types'
import { customReportRangeSchema } from '@/features/reports/schemas'

function formatMoney(valueInCents: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valueInCents / 100)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'full' }).format(new Date(`${value}T00:00:00`))
}

function getPaymentMethodLabel(value: 'cash' | 'card' | 'transfer') {
  switch (value) {
    case 'cash':
      return 'Efectivo'
    case 'card':
      return 'Tarjeta'
    case 'transfer':
      return 'Transferencia'
  }
}

function getErrorMessage(error: string) {
  switch (error) {
    case 'invalid_report_range':
    case 'invalid_report_date':
    case 'validation_error':
      return 'Revisa el rango del reporte. Las fechas deben ser coherentes.'
    case 'invalid_database_file':
      return 'El archivo seleccionado no parece una base válida de Mis Trapitos.'
    case 'database_file_not_found':
      return 'El archivo seleccionado ya no existe.'
    case 'forbidden':
      return 'Solo el administrador puede consultar reportes o gestionar respaldos.'
    case 'unauthorized':
      return 'La sesión expiró. Vuelve a iniciar sesión.'
    default:
      return 'No pudimos cargar el reporte solicitado.'
  }
}

export function ReportsPage() {
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('today')
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' })
  const [report, setReport] = useState<SalesReport | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const filteredProducts = useMemo(() => {
    if (categoryFilter === 'all') {
      return products
    }

    return products.filter((product) => product.categoryId === Number(categoryFilter))
  }, [categoryFilter, products])

  async function loadStaticData() {
    const [categoriesResponse, productsResponse, offersResponse] = await Promise.all([
      window.api.catalog.listCategories(),
      window.api.catalog.listProducts({ active: 'all' }),
      window.api.offers.list({ status: 'active' }),
    ])

    if (!categoriesResponse.ok) {
      throw new Error(categoriesResponse.error)
    }

    if (!productsResponse.ok) {
      throw new Error(productsResponse.error)
    }

    if (!offersResponse.ok) {
      throw new Error(offersResponse.error)
    }

    setCategories(categoriesResponse.data)
    setProducts(productsResponse.data)
    setOffers(offersResponse.data)
  }

  async function loadReport(nextPeriod = reportPeriod) {
    const filters = nextPeriod === 'custom'
      ? (() => {
          const parsed = customReportRangeSchema.parse(customRange)
          return { period: 'custom' as const, startDate: parsed.startDate, endDate: parsed.endDate }
        })()
      : { period: nextPeriod }

    const response = await window.api.reports.getSalesSummary(filters)
    if (!response.ok) {
      throw new Error(response.error)
    }

    setReport(response.data)
  }

  async function loadAll(nextPeriod = reportPeriod) {
    setLoading(true)
    setError(null)

    try {
      await Promise.all([loadStaticData(), loadReport(nextPeriod)])
    } catch (caughtError) {
      const code = caughtError instanceof Error ? caughtError.message : 'unknown_error'
      setError(getErrorMessage(code))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  const handlePeriodChange = async (nextPeriod: ReportPeriod) => {
    setReportPeriod(nextPeriod)
    setFeedback(null)
    if (nextPeriod !== 'custom') {
      await loadAll(nextPeriod)
    }
  }

  const handleCustomSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)
    await loadAll('custom')
  }

  const handleExportDatabase = async () => {
    setFeedback(null)
    setError(null)
    const response = await window.api.system.exportDatabase()

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    if (response.data.canceled) {
      return
    }

    setFeedback(`Respaldo exportado en ${response.data.filePath}.`)
  }

  const handleImportDatabase = async () => {
    if (!window.confirm('¿Seguro que deseas importar una base externa? La aplicación se reiniciará y la base actual será reemplazada.')) {
      return
    }

    setFeedback(null)
    setError(null)
    const response = await window.api.system.importDatabase()

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    if (response.data.canceled) {
      return
    }

    setFeedback('Importación aceptada. La aplicación se reiniciará para abrir la nueva base.')
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-400"></p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Reportes básicos y resguardo de base</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Este panel permite consultar ventas, stock, promociones vigentes y generar respaldos de la operación.
        </p>
        {error ? <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
        {feedback ? <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{feedback}</p> : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-wrap gap-3">
            {(['today', 'month', 'custom'] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => void handlePeriodChange(period)}
                className={[
                  'rounded-2xl border px-4 py-3 text-sm transition',
                  reportPeriod === period ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100' : 'border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800',
                ].join(' ')}
              >
                {period === 'today' ? 'Día' : period === 'month' ? 'Mes' : 'Rango personalizado'}
              </button>
            ))}
          </div>

          {reportPeriod === 'custom' ? (
            <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleCustomSubmit}>
              <input type="date" value={customRange.startDate} onChange={(event) => setCustomRange((current) => ({ ...current, startDate: event.target.value }))} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" />
              <input type="date" value={customRange.endDate} onChange={(event) => setCustomRange((current) => ({ ...current, endDate: event.target.value }))} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" />
              <button type="submit" className="rounded-2xl bg-emerald-500 px-4 py-3 font-medium text-slate-950 hover:bg-emerald-400">Actualizar</button>
            </form>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <button type="button" onClick={() => void handleExportDatabase()} className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-left text-emerald-100 hover:bg-emerald-500/20">
            <p className="font-medium">Exportar base de datos</p>
            <p className="mt-1 text-sm text-emerald-200/80">Genera un respaldo local consistente.</p>
          </button>
          <button type="button" onClick={() => void handleImportDatabase()} className="rounded-3xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-left text-amber-100 hover:bg-amber-500/20">
            <p className="font-medium">Importar base de datos</p>
            <p className="mt-1 text-sm text-amber-200/80">Reemplaza la base actual y reinicia la aplicación.</p>
          </button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="text-sm text-slate-400">Ventas registradas</p>
          <p className="mt-2 text-3xl font-semibold text-white">{report?.totalSalesCount ?? 0}</p>
        </article>
        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="text-sm text-slate-400">Total vendido</p>
          <p className="mt-2 text-3xl font-semibold text-white">{formatMoney(report?.totalInCents ?? 0)}</p>
        </article>
        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="text-sm text-slate-400">Cobrado en efectivo</p>
          <p className="mt-2 text-3xl font-semibold text-white">{formatMoney(report?.totalsByPaymentMethod.cash ?? 0)}</p>
        </article>
        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="text-sm text-slate-400">Cobrado por medios digitales</p>
          <p className="mt-2 text-3xl font-semibold text-white">{formatMoney((report?.totalsByPaymentMethod.card ?? 0) + (report?.totalsByPaymentMethod.transfer ?? 0))}</p>
        </article>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-xl font-semibold text-white">{report?.label ?? 'Ventas'}</h3>
          <p className="mt-1 text-sm text-slate-400">Lista completa con desglose por método y agrupación por día cuando corresponde.</p>
          {loading ? <p className="mt-5 text-sm text-slate-400">Cargando ventas...</p> : null}

          <div className="mt-5 space-y-5">
            {report?.groupedByDay.length ? report.groupedByDay.map((group) => (
              <div key={group.day} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="font-medium text-white">{formatDay(group.day)}</h4>
                    <p className="text-sm text-slate-400">{group.sales.length} ventas</p>
                  </div>
                  <p className="text-sm font-medium text-emerald-200">{formatMoney(group.totalInCents)}</p>
                </div>

                <div className="mt-4 space-y-3">
                  {group.sales.map((sale) => (
                    <article key={sale.saleId} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">Venta #{sale.saleId}</p>
                          <p className="text-sm text-slate-400">{formatDate(sale.createdAt)} · {sale.itemCount} ítems · vendedor {sale.sellerName}</p>
                          <p className="mt-1 text-sm text-slate-300">Cliente: {sale.customerName ?? 'Consumidor final'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-emerald-200">{formatMoney(sale.totalInCents)}</p>
                          <p className="text-sm uppercase text-slate-400">{getPaymentMethodLabel(sale.paymentMethod)}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )) : !loading ? <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">No hay ventas para el rango elegido.</p> : null}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-white">Stock disponible</h3>
                <p className="mt-1 text-sm text-slate-400">Consulta el stock real actual y filtra los productos por categoría.</p>
              </div>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400">
                <option value="all">Todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            <div className="mt-5 space-y-3">
              {filteredProducts.slice(0, 12).map((product) => (
                <article key={product.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{product.name}</p>
                      <p className="text-sm text-slate-400">{product.categoryName}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${product.stock < 5 ? 'text-amber-200' : 'text-emerald-200'}`}>Stock {product.stock}</p>
                      <p className="text-sm text-slate-400">{formatMoney(product.priceInCents)}</p>
                    </div>
                  </div>
                </article>
              ))}
              {!filteredProducts.length ? <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">No hay productos para esa categoría.</p> : null}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-xl font-semibold text-white">Ofertas vigentes</h3>
            <p className="mt-1 text-sm text-slate-400">Promociones activas en este momento. El POS aplica automáticamente los descuentos vigentes.</p>

            <div className="mt-5 space-y-3">
              {offers.map((offer) => (
                <article key={offer.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{offer.productName}</p>
                      <p className="text-sm text-slate-400">{offer.categoryName}</p>
                      <p className="mt-1 text-sm text-slate-300">{formatDate(offer.startAt)} → {formatDate(offer.endAt)}</p>
                    </div>
                    <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-200">-{offer.discountPercent}%</div>
                  </div>
                </article>
              ))}
              {!offers.length ? <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">No hay ofertas activas en este momento.</p> : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
