import { useEffect, useMemo, useState } from 'react'
import type { Offer, OfferStatus, Product } from '../../../../shared/types'
import { offerFormSchema } from '@/features/offers/schemas'

type OfferFormState = {
  productId: string
  discountPercent: string
  startAt: string
  endAt: string
}

const defaultOfferForm: OfferFormState = {
  productId: '',
  discountPercent: '',
  startAt: '',
  endAt: '',
}

function toDateInput(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getStatusLabel(status: OfferStatus) {
  switch (status) {
    case 'active':
      return 'Activa'
    case 'scheduled':
      return 'Programada'
    case 'expired':
      return 'Vencida'
  }
}

function getErrorMessage(error: string) {
  switch (error) {
    case 'invalid_offer_window':
      return 'La fecha fin tiene que ser posterior al inicio.'
    case 'offer_not_found':
      return 'La oferta ya no existe. Vuelve a cargar la vista.'
    case 'product_not_found':
      return 'El producto seleccionado ya no existe.'
    case 'product_inactive':
      return 'No puedes crear ofertas sobre productos inactivos.'
    case 'validation_error':
      return 'Hay datos inválidos en el formulario de ofertas.'
    case 'forbidden':
      return 'Tu rol no tiene permiso para gestionar ofertas.'
    case 'unauthorized':
      return 'La sesión expiró. Vuelve a iniciar sesión.'
    default:
      return 'No se pudo guardar la oferta. Revisa los datos e inténtalo de nuevo.'
  }
}

export function OffersPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [offerForm, setOfferForm] = useState<OfferFormState>(defaultOfferForm)
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | OfferStatus>('all')
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeProducts = useMemo(() => products.filter((product) => product.active), [products])

  async function loadData(nextStatusFilter = statusFilter) {
    setLoading(true)
    setError(null)

    const [productsResponse, offersResponse] = await Promise.all([
      window.api.catalog.listProducts({ active: 'all' }),
      window.api.offers.list({ status: nextStatusFilter }),
    ])

    if (!productsResponse.ok) {
      setError(getErrorMessage(productsResponse.error))
      setLoading(false)
      return
    }

    if (!offersResponse.ok) {
      setError(getErrorMessage(offersResponse.error))
      setLoading(false)
      return
    }

    setProducts(productsResponse.data)
    setOffers(offersResponse.data)
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    void loadData(statusFilter)
  }, [statusFilter])

  const resetForm = () => {
    setEditingOffer(null)
    setOfferForm(defaultOfferForm)
  }

  const startEditing = (offer: Offer) => {
    setEditingOffer(offer)
    setOfferForm({
      productId: String(offer.productId),
      discountPercent: String(offer.discountPercent),
      startAt: toDateInput(offer.startAt),
      endAt: toDateInput(offer.endAt),
    })
    setFeedback(null)
    setError(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)
    setError(null)

    const parsed = offerFormSchema.safeParse(offerForm)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa el formulario de la oferta.')
      return
    }

    const payload = {
      productId: Number(parsed.data.productId),
      discountPercent: Number(parsed.data.discountPercent),
      startAt: new Date(parsed.data.startAt).toISOString(),
      endAt: new Date(parsed.data.endAt).toISOString(),
    }

    const response = editingOffer
      ? await window.api.offers.update({ id: editingOffer.id, ...payload })
      : await window.api.offers.create(payload)

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    resetForm()
    setFeedback(editingOffer ? 'Oferta actualizada.' : 'Oferta creada.')
    await loadData()
  }

  const handleDelete = async (offer: Offer) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la oferta de ${offer.productName}?`)) {
      return
    }

    setFeedback(null)
    setError(null)

    const response = await window.api.offers.delete({ id: offer.id })
    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    if (editingOffer?.id === offer.id) {
      resetForm()
    }

    setFeedback('Oferta eliminada.')
    await loadData()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Fase 5</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Ofertas automáticas</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Configura descuentos con vigencia definida para que el sistema los aplique automáticamente durante la venta.
        </p>
        {error ? <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
        {feedback ? <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{feedback}</p> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white">Crear o editar oferta</h3>
              <p className="mt-1 text-sm text-slate-400">Configura el descuento por producto con fecha de inicio y fin.</p>
            </div>
            {editingOffer ? (
              <button type="button" onClick={resetForm} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
                Cancelar edición
              </button>
            ) : null}
          </div>

          <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
            <label className="block space-y-2 text-sm text-slate-300">
              <span>Producto</span>
              <select value={offerForm.productId} onChange={(event) => setOfferForm((current) => ({ ...current, productId: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400">
                <option value="">Selecciona un producto</option>
                {activeProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {product.categoryName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2 text-sm text-slate-300">
              <span>Descuento (%)</span>
              <input value={offerForm.discountPercent} onChange={(event) => setOfferForm((current) => ({ ...current, discountPercent: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="15" />
            </label>

            <label className="block space-y-2 text-sm text-slate-300">
              <span>Inicio</span>
              <input type="datetime-local" value={offerForm.startAt} onChange={(event) => setOfferForm((current) => ({ ...current, startAt: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" />
            </label>

            <label className="block space-y-2 text-sm text-slate-300">
              <span>Fin</span>
              <input type="datetime-local" value={offerForm.endAt} onChange={(event) => setOfferForm((current) => ({ ...current, endAt: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" />
            </label>

            <button type="submit" className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-emerald-400">
              {editingOffer ? 'Guardar cambios' : 'Crear oferta'}
            </button>
          </form>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Ofertas registradas</h3>
                <p className="mt-1 text-sm text-slate-400">Si hay solapamiento entre ofertas, el sistema lo muestra para facilitar la revisión.</p>
              </div>

              <label className="space-y-2 text-sm text-slate-300">
                <span className="block">Estado</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | OfferStatus)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400">
                  <option value="all">Todas</option>
                  <option value="active">Activas</option>
                  <option value="scheduled">Programadas</option>
                  <option value="expired">Vencidas</option>
                </select>
              </label>
            </div>

            {loading ? <p className="mt-5 text-sm text-slate-400">Cargando ofertas...</p> : null}
            {!loading && offers.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">Aún no hay ofertas registradas para este filtro.</p> : null}

            <div className="mt-5 space-y-3">
              {offers.map((offer) => (
                <article key={offer.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium text-white">{offer.productName}</h4>
                        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{offer.categoryName}</span>
                        <span className={`rounded-full px-3 py-1 text-xs ${offer.status === 'active' ? 'bg-emerald-500/10 text-emerald-200' : offer.status === 'scheduled' ? 'bg-sky-500/10 text-sky-200' : 'bg-slate-800 text-slate-300'}`}>
                          {getStatusLabel(offer.status)}
                        </span>
                        {offer.hasOverlap ? <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-200">Solapa con otra</span> : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{offer.discountPercent}% de descuento</p>
                      <p className="mt-1 text-sm text-slate-400">{formatDate(offer.startAt)} → {formatDate(offer.endAt)}</p>
                    </div>

                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEditing(offer)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800">
                        Editar
                      </button>
                      <button type="button" onClick={() => void handleDelete(offer)} className="rounded-xl border border-rose-500/30 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/10">
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
