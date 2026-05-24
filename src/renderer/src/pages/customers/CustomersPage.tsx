import { useEffect, useMemo, useState } from 'react'
import type { Customer, CustomerSaleSummary, SaleTicket } from '../../../../shared/types'
import { customerFormSchema } from '@/features/customers/schemas'
import { SaleTicketView } from '@/components/sales/SaleTicketView'

type CustomerFormState = {
  name: string
  phone: string
  email: string
  address: string
}

const defaultCustomerForm: CustomerFormState = {
  name: '',
  phone: '',
  email: '',
  address: '',
}

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(valueInCents / 100)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getErrorMessage(error: string) {
  switch (error) {
    case 'validation_error':
      return 'Hay datos inválidos en el formulario del cliente.'
    case 'customer_not_found':
      return 'El cliente ya no existe. Vuelve a cargar la lista.'
    case 'sale_not_found':
      return 'La venta que intentaste abrir ya no existe.'
    case 'forbidden':
      return 'Tu rol no tiene permiso para gestionar clientes.'
    case 'unauthorized':
      return 'La sesión expiró. Vuelve a iniciar sesión.'
    default:
      return 'No se pudo completar la operación del módulo de clientes. Revisa los datos e inténtalo nuevamente.'
  }
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [history, setHistory] = useState<CustomerSaleSummary[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(defaultCustomerForm)
  const [search, setSearch] = useState('')
  const [selectedSaleTicket, setSelectedSaleTicket] = useState<SaleTicket | null>(null)
  const [loadingTicket, setLoadingTicket] = useState(false)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  )

  async function loadCustomers(nextSelectedCustomerId?: number | null, nextSearch?: string) {
    setLoading(true)
    setError(null)

    const customersResponse = await window.api.customers.list({
      search: nextSearch ?? search,
    })

    if (!customersResponse.ok) {
      setError(getErrorMessage(customersResponse.error))
      setLoading(false)
      return
    }

    const customersData = customersResponse.data
    setCustomers(customersData)
    setSelectedSaleTicket(null)

    const customerIdToLoad = nextSelectedCustomerId ?? selectedCustomerId ?? customersData[0]?.id ?? null
    setSelectedCustomerId(customerIdToLoad)

    if (!customerIdToLoad) {
      setHistory([])
      setLoading(false)
      return
    }

    const historyResponse = await window.api.customers.history(customerIdToLoad)
    if (!historyResponse.ok) {
      setError(getErrorMessage(historyResponse.error))
      setLoading(false)
      return
    }

    setHistory(historyResponse.data)
    setLoading(false)
  }

  useEffect(() => {
    void loadCustomers()
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCustomers(selectedCustomerId, search)
    }, 200)

    return () => window.clearTimeout(timeoutId)
  }, [search])

  const resetForm = () => {
    setEditingCustomer(null)
    setCustomerForm(defaultCustomerForm)
  }

  const startEditing = (customer: Customer) => {
    setEditingCustomer(customer)
    setCustomerForm({
      name: customer.name,
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
    })
    setError(null)
    setFeedback(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setFeedback(null)

    const parsed = customerFormSchema.safeParse(customerForm)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa el formulario del cliente.')
      return
    }

    const payload = {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
    }

    const response = editingCustomer
      ? await window.api.customers.update({ id: editingCustomer.id, ...payload })
      : await window.api.customers.create(payload)

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    const selected = editingCustomer?.id ?? response.data.id
    resetForm()
    setFeedback(editingCustomer ? 'Cliente actualizado.' : 'Cliente creado.')
    await loadCustomers(selected)
  }

  const handleOpenTicket = async (saleId: number) => {
    setError(null)
    setFeedback(null)
    setLoadingTicket(true)

    const response = await window.api.sales.getTicket(saleId)
    setLoadingTicket(false)

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    setSelectedSaleTicket(response.data)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-400"></p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Clientes e historial comercial</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Registra clientes y consulta su historial de compras en un solo lugar para dar seguimiento a la relación comercial.
        </p>
        {error ? <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
        {feedback ? <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{feedback}</p> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white">Registro de clientes</h3>
                <p className="mt-1 text-sm text-slate-400">Registra y actualiza clientes sin perder el historial de compras.</p>
            </div>
            {editingCustomer ? (
              <button type="button" onClick={resetForm} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
                Cancelar edición
              </button>
            ) : null}
          </div>

          <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
            <label className="block space-y-2 text-sm text-slate-300">
              <span>Nombre</span>
              <input value={customerForm.name} onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Ej: Martina López" />
            </label>

            <label className="block space-y-2 text-sm text-slate-300">
              <span>Teléfono</span>
                <input value={customerForm.phone} onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="5551234567" />
            </label>

            <label className="block space-y-2 text-sm text-slate-300">
              <span>Email</span>
              <input value={customerForm.email} onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="cliente@mail.com" />
            </label>

            <label className="block space-y-2 text-sm text-slate-300">
              <span>Dirección</span>
              <textarea value={customerForm.address} onChange={(event) => setCustomerForm((current) => ({ ...current, address: event.target.value }))} className="min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Barrio, calle, referencias..." />
            </label>

            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">
              {editingCustomer ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </form>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Buscador y listado</h3>
                <p className="mt-1 text-sm text-slate-400">Búsqueda por nombre o teléfono, exactamente como pide el PRD.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                {customers.length} cliente{customers.length === 1 ? '' : 's'} en vista actual
              </div>
            </div>

            <label className="mt-5 block space-y-2 text-sm text-slate-300">
              <span>Búsqueda</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Nombre o teléfono" />
            </label>

            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr_1fr] gap-3 bg-slate-950/90 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                <span>Cliente</span>
                <span>Teléfono</span>
                <span>Email</span>
                <span>Compras</span>
                <span>Acciones</span>
              </div>

              {loading ? <p className="px-4 py-6 text-sm text-slate-400">Cargando clientes...</p> : null}
              {!loading && customers.length === 0 ? <p className="px-4 py-6 text-sm text-slate-400">Aún no hay clientes para esos filtros.</p> : null}

              <div className="divide-y divide-slate-800 bg-slate-900/60">
                {customers.map((customer) => (
                  <article key={customer.id} className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr_1fr] gap-3 px-4 py-4 text-sm text-slate-200">
                    <div>
                      <button type="button" onClick={() => void loadCustomers(customer.id)} className="text-left font-medium text-white underline-offset-4 hover:underline">
                        {customer.name}
                      </button>
                      <p className="mt-1 text-xs text-slate-400">Última compra: {customer.lastPurchaseAt ? formatDate(customer.lastPurchaseAt) : 'Sin historial por el momento'}</p>
                    </div>
                    <span>{customer.phone ?? '—'}</span>
                    <span>{customer.email ?? '—'}</span>
                    <span>{customer.purchasesCount}</span>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => startEditing(customer)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800">
                        Editar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Historial del cliente</h3>
                <p className="mt-1 text-sm text-slate-400">Las ventas registradas se agregan automáticamente a esta ficha para mantener el historial actualizado.</p>
              </div>
              {selectedCustomer ? <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">{selectedCustomer.name}</div> : null}
            </div>

            {!selectedCustomer ? <p className="mt-5 text-sm text-slate-400">Selecciona un cliente para ver su historial.</p> : null}

            {selectedCustomer ? (
              <div className="mt-5 space-y-3">
                {history.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">Este cliente aún no tiene compras registradas.</p> : null}

                 {history.map((sale) => (
                   <article key={sale.saleId} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                     <div className="flex flex-wrap items-center justify-between gap-3">
                       <div>
                         <h4 className="font-medium text-white">Venta #{sale.saleId}</h4>
                        <p className="mt-1 text-sm text-slate-400">
                          {formatDate(sale.createdAt)} · {sale.itemCount} ítem{sale.itemCount === 1 ? '' : 's'} · {sale.paymentMethod}
                        </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-300">{formatCurrency(sale.totalInCents)}</span>
                          <button
                            type="button"
                            onClick={() => void handleOpenTicket(sale.saleId)}
                            className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
                          >
                            Ver detalle
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
          </div>
        </section>
      </div>

      {selectedSaleTicket ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSaleTicket(null)}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800"
              >
                Cerrar detalle
              </button>
            </div>
            <SaleTicketView ticket={selectedSaleTicket} />
          </div>
        </div>
      ) : null}

      {loadingTicket ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 px-6 py-5 text-sm text-slate-200">
            Cargando detalle de venta...
          </div>
        </div>
      ) : null}
    </div>
  )
}
