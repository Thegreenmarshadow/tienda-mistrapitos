import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Customer, PaymentMethod, PosProduct, SaleTicket } from '../../../../shared/types'
import { quickCustomerSchema } from '@/features/sales/schemas'
import { usePosDraft } from '@/shared/pos-draft-context'
import { SaleTicketView } from '@/components/sales/SaleTicketView'

type CartItem = {
  product: PosProduct
  quantity: number
}

type QuickCustomerForm = {
  name: string
  phone: string
  email: string
  address: string
}

const defaultQuickCustomerForm: QuickCustomerForm = {
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

function getPaymentLabel(method: PaymentMethod) {
  switch (method) {
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
    case 'validation_error':
      return 'Hay datos no válidos. Revisa el formulario o el proceso de cobro.'
    case 'empty_sale':
      return 'No puedes confirmar una venta sin productos en el carrito.'
    case 'invalid_quantity':
      return 'La cantidad de algún producto no es válida.'
    case 'product_not_found':
      return 'Uno de los productos ya no existe. Vuelve a cargar la búsqueda.'
    case 'product_inactive':
      return 'Hay un producto desactivado en el carrito. Retíralo antes de cobrar.'
    case 'insufficient_stock':
      return 'El stock cambió antes de confirmar. Revisa el carrito e inténtalo nuevamente.'
    case 'customer_not_found':
      return 'El cliente seleccionado ya no existe. Selecciónalo nuevamente.'
    case 'forbidden':
      return 'Tu rol no tiene permiso para operar ventas.'
    case 'unauthorized':
      return 'La sesión expiró. Vuelve a iniciar sesión.'
    default:
      return 'No se pudo completar la operación del POS. Inténtalo de nuevo.'
  }
}

export function PosPage() {
  const { setHasPendingCart } = usePosDraft()
  const [products, setProducts] = useState<PosProduct[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerOptions, setCustomerOptions] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [ticket, setTicket] = useState<SaleTicket | null>(null)
  const [quickCustomerForm, setQuickCustomerForm] = useState<QuickCustomerForm>(defaultQuickCustomerForm)
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [submittingSale, setSubmittingSale] = useState(false)
  const [submittingCustomer, setSubmittingCustomer] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cartDetails = useMemo(
    () =>
      cart.map((item) => ({
        ...item,
        subtotalInCents: item.product.priceWithDiscountInCents * item.quantity,
      })),
    [cart],
  )

  const totalInCents = useMemo(
    () => cartDetails.reduce((accumulator, item) => accumulator + item.subtotalInCents, 0),
    [cartDetails],
  )

  async function loadProducts(nextSearch?: string) {
    setLoadingProducts(true)
    const response = await window.api.sales.searchProducts(nextSearch ?? productSearch)

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      setLoadingProducts(false)
      return
    }

    setProducts(response.data)
    setCart((current) =>
      current.map((item) => ({
        ...item,
        product: response.data.find((product) => product.id === item.product.id) ?? item.product,
      })),
    )
    setLoadingProducts(false)
  }

  async function loadCustomers(nextSearch?: string) {
    setLoadingCustomers(true)
    const response = await window.api.customers.list({ search: nextSearch ?? customerSearch })

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      setLoadingCustomers(false)
      return
    }

    setCustomerOptions(response.data.slice(0, 6))
    setLoadingCustomers(false)
  }

  useEffect(() => {
    void loadProducts('')
    void loadCustomers('')
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProducts(productSearch)
    }, 180)

    return () => window.clearTimeout(timeoutId)
  }, [productSearch])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCustomers(customerSearch)
    }, 180)

    return () => window.clearTimeout(timeoutId)
  }, [customerSearch])

  useEffect(() => {
    setHasPendingCart(cart.length > 0)
  }, [cart.length, setHasPendingCart])

  useEffect(() => () => setHasPendingCart(false), [setHasPendingCart])

  const clearSale = () => {
    setCart([])
    setSelectedCustomer(null)
    setCustomerSearch('')
    setPaymentMethod('cash')
    setTicket(null)
    setFeedback(null)
    setError(null)
  }

  const addToCart = (product: PosProduct) => {
    setError(null)
    setFeedback(null)

    if (product.stock <= 0) {
      setError('Ese producto no tiene stock disponible.')
      return
    }

    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id)
      if (!existing) {
        return [...current, { product, quantity: 1 }]
      }

      if (existing.quantity >= existing.product.stock) {
      setError('No puedes vender más unidades que el stock disponible.')
        return current
      }

      return current.map((item) =>
        item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
      )
    })
  }

  const updateQuantity = (productId: number, quantity: number) => {
    const product = cart.find((item) => item.product.id === productId)?.product
    if (!product) {
      return
    }

    if (quantity <= 0) {
      setCart((current) => current.filter((item) => item.product.id !== productId))
      return
    }

    if (quantity > product.stock) {
      setError('La cantidad supera el stock disponible.')
      return
    }

    setCart((current) => current.map((item) => (item.product.id === productId ? { ...item, quantity } : item)))
  }

  const handleQuickCustomerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setFeedback(null)

    const parsed = quickCustomerSchema.safeParse(quickCustomerForm)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa el registro rápido del cliente.')
      return
    }

    setSubmittingCustomer(true)
    const response = await window.api.customers.create({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
    })
    setSubmittingCustomer(false)

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    setSelectedCustomer(response.data)
    setIsQuickCustomerOpen(false)
    setQuickCustomerForm(defaultQuickCustomerForm)
    setFeedback('Cliente creado y vinculado a la venta.')
    await loadCustomers('')
  }

  const handleCheckout = async () => {
    setSubmittingSale(true)
    setError(null)
    setFeedback(null)

    const response = await window.api.sales.checkout({
      customerId: selectedCustomer?.id ?? null,
      paymentMethod,
      items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
    })

    setSubmittingSale(false)

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      await loadProducts(productSearch)
      return
    }

    setTicket(response.data)
    setCart([])
    setSelectedCustomer(null)
    setCustomerSearch('')
    setPaymentMethod('cash')
    setFeedback('Venta confirmada. Stock y ticket registrados correctamente.')
    await loadProducts(productSearch)
    await loadCustomers('')
  }

  if (ticket) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-400"></p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Ticket post-venta</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            La venta ya actualizó el stock, el historial y la auditoría. Aquí puedes consultar el comprobante generado.
          </p>
          {feedback ? <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{feedback}</p> : null}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <SaleTicketView ticket={ticket} />

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-100 hover:bg-slate-800"
            >
              Imprimir
            </button>
            <button
              type="button"
              onClick={clearSale}
              className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Nueva venta
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Fase 4</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">POS y ventas</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Busca productos, registra el cobro y confirma la venta en una sola operación consistente.
        </p>
        {error ? <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
        {feedback ? <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{feedback}</p> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Buscador de productos</h3>
                <p className="mt-1 text-sm text-slate-400">Busca productos por nombre, categoría o SKU para agregarlos al carrito.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                {products.length} producto{products.length === 1 ? '' : 's'} en resultado
              </div>
            </div>

            <label className="mt-5 block space-y-2 text-sm text-slate-300">
              <span>Búsqueda</span>
              <input
                autoFocus
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                placeholder="Ej.: camiseta negra, accesorios o SKU"
              />
            </label>

            <div className="mt-6 space-y-3">
              {loadingProducts ? <p className="text-sm text-slate-400">Buscando productos...</p> : null}
              {!loadingProducts && products.length === 0 ? <p className="text-sm text-slate-400">No hay productos para esa búsqueda.</p> : null}

              {products.map((product) => (
                <article key={product.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="font-medium text-white">{product.name}</h4>
                      <p className="mt-1 text-sm text-slate-400">
                        {product.categoryName}
                        {product.size ? ` · Talla ${product.size}` : ''}
                        {product.color ? ` · ${product.color}` : ''}
                      </p>
                      {product.sku ? <p className="mt-1 text-xs uppercase tracking-[0.2em] text-sky-200">SKU {product.sku}</p> : null}
                      <p className="mt-2 text-sm text-slate-300">Stock disponible: {product.stock}</p>
                    </div>

                    <div className="text-right">
                      {product.activeDiscountPercent > 0 ? (
                        <>
                          <p className="text-sm text-slate-500 line-through">{formatCurrency(product.priceInCents)}</p>
                          <p className="text-lg font-semibold text-emerald-300">{formatCurrency(product.priceWithDiscountInCents)}</p>
                          <p className="text-xs text-emerald-200">{product.activeDiscountPercent}% off</p>
                        </>
                      ) : (
                        <p className="text-lg font-semibold text-emerald-300">{formatCurrency(product.priceInCents)}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        disabled={product.stock <= 0}
                        className="mt-3 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {product.stock <= 0 ? 'Sin stock' : 'Agregar al carrito'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-xl font-semibold text-white">Carrito</h3>
            <p className="mt-1 text-sm text-slate-400">Modificar cantidad, validar stock y cerrar la venta con un método de pago.</p>

            <div className="mt-5 space-y-3">
              {cartDetails.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">Aún no has agregado productos.</p> : null}

              {cartDetails.map((item) => (
                <article key={item.product.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="font-medium text-white">{item.product.name}</h4>
                      <p className="mt-1 text-sm text-slate-400">
                        {item.product.activeDiscountPercent > 0
                          ? `${formatCurrency(item.product.priceInCents)} → ${formatCurrency(item.product.priceWithDiscountInCents)} por unidad · ${item.product.activeDiscountPercent}% off`
                          : `${formatCurrency(item.product.priceInCents)} por unidad`}
                      </p>
                    </div>
                    <button type="button" onClick={() => updateQuantity(item.product.id, 0)} className="text-sm text-rose-300 hover:text-rose-200">
                      Quitar
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">-</button>
                      <input
                        value={item.quantity}
                        onChange={(event) => updateQuantity(item.product.id, Number(event.target.value) || 0)}
                        className="w-20 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-center text-white outline-none focus:border-emerald-400"
                        inputMode="numeric"
                      />
                      <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">+</button>
                    </div>
                    <span className="text-sm text-slate-200">{formatCurrency(item.subtotalInCents)}</span>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 border-t border-slate-800 pt-5">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Total actual</span>
                <strong className="text-xl text-emerald-300">{formatCurrency(totalInCents)}</strong>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Cliente y cobro</h3>
                <p className="mt-1 text-sm text-slate-400">El cliente es opcional, pero si deseas conservar su historial debes vincularlo a la venta.</p>
              </div>
              <button type="button" onClick={() => setIsQuickCustomerOpen(true)} className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800">
                Nuevo cliente
              </button>
            </div>

            <label className="mt-5 block space-y-2 text-sm text-slate-300">
              <span>Buscar cliente</span>
              <input
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                placeholder="Nombre o teléfono"
              />
            </label>

            <div className="mt-4 space-y-2">
              {loadingCustomers ? <p className="text-sm text-slate-400">Buscando clientes...</p> : null}
              {!loadingCustomers && customerOptions.length === 0 ? <p className="text-sm text-slate-400">No encontramos clientes con ese filtro.</p> : null}

              {customerOptions.map((customer) => (
                <button
                  type="button"
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className="block w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-left hover:border-emerald-500/40 hover:bg-emerald-500/5"
                >
                  <p className="font-medium text-white">{customer.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{customer.phone ?? 'Sin teléfono'} · {customer.email ?? 'Sin email'}</p>
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
              Cliente vinculado: <strong className="text-white">{selectedCustomer?.name ?? 'Consumidor final'}</strong>
            </div>

            <div className="mt-5 space-y-3">
              <p className="text-sm font-medium text-slate-200">Método de pago</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {(['cash', 'card', 'transfer'] as const).map((method) => {
                  const active = paymentMethod === method
                  return (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={[
                        'rounded-2xl border px-4 py-3 text-sm transition',
                        active
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                          : 'border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-800',
                      ].join(' ')}
                    >
                      {getPaymentLabel(method)}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleCheckout()}
              disabled={cartDetails.length === 0 || submittingSale}
              className="mt-6 w-full rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submittingSale ? 'Confirmando venta...' : 'Confirmar venta'}
            </button>
          </div>
        </section>
      </div>

      {isQuickCustomerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Registro rápido de cliente</h3>
                <p className="mt-1 text-sm text-slate-400">Crea un cliente sin salir del POS para continuar con la venta.</p>
              </div>
              <button type="button" onClick={() => setIsQuickCustomerOpen(false)} className="text-sm text-slate-400 hover:text-white">
                Cerrar
              </button>
            </div>

            <form className="mt-5 space-y-3" onSubmit={(event) => void handleQuickCustomerSubmit(event)}>
              <label className="block space-y-2 text-sm text-slate-300">
                <span>Nombre</span>
                <input value={quickCustomerForm.name} onChange={(event) => setQuickCustomerForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" />
              </label>
              <label className="block space-y-2 text-sm text-slate-300">
                <span>Teléfono</span>
                <input value={quickCustomerForm.phone} onChange={(event) => setQuickCustomerForm((current) => ({ ...current, phone: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" />
              </label>
              <label className="block space-y-2 text-sm text-slate-300">
                <span>Email</span>
                <input value={quickCustomerForm.email} onChange={(event) => setQuickCustomerForm((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" />
              </label>
              <label className="block space-y-2 text-sm text-slate-300">
                <span>Dirección</span>
                <textarea value={quickCustomerForm.address} onChange={(event) => setQuickCustomerForm((current) => ({ ...current, address: event.target.value }))} className="min-h-24 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" />
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsQuickCustomerOpen(false)} className="rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-100 hover:bg-slate-800">
                  Cancelar
                </button>
                <button type="submit" disabled={submittingCustomer} className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">
                  {submittingCustomer ? 'Guardando...' : 'Crear y vincular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
