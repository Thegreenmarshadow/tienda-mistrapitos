import { type FormEvent, useEffect, useState } from 'react'
import type { Category, InventoryMovement, Product, Supplier } from '../../../../shared/types'
import { stockAdjustmentSchema, stockEntrySchema } from '@/features/inventory/schemas'
import { useAuth } from '@/shared/auth-context'

type EntryItemFormState = {
  productId: string
  quantity: string
}

type EntryFormState = {
  items: EntryItemFormState[]
  note: string
}

type AdjustmentFormState = {
  productId: string
  delta: string
  note: string
}

const defaultEntryItem: EntryItemFormState = {
  productId: '',
  quantity: '',
}

const defaultAdjustmentForm: AdjustmentFormState = {
  productId: '',
  delta: '',
  note: '',
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
      return 'Hay datos inválidos en el formulario de inventario.'
    case 'empty_stock_entry':
      return 'Agregá al menos un producto para registrar entrada.'
    case 'invalid_stock_quantity':
      return 'La cantidad de entrada debe ser un entero positivo.'
    case 'invalid_adjustment_delta':
      return 'El ajuste debe ser un entero distinto de cero.'
    case 'invalid_adjustment_note':
      return 'El ajuste necesita un motivo claro.'
    case 'negative_stock':
      return 'Ese ajuste dejaría el stock en negativo. Así no se opera un inventario serio.'
    case 'product_not_found':
      return 'El producto seleccionado ya no existe. Recargá la lista.'
    case 'forbidden':
      return 'Tu rol no tiene permiso para esa operación de inventario.'
    case 'unauthorized':
      return 'La sesión expiró. Volvé a iniciar sesión.'
    default:
      return 'No se pudo registrar el movimiento de inventario.'
  }
}

function getReasonLabel(reason: InventoryMovement['reason']) {
  switch (reason) {
    case 'entry':
      return 'Entrada'
    case 'adjustment':
      return 'Ajuste'
    case 'sale':
      return 'Venta'
  }
}

function createEmptyEntryItem(): EntryItemFormState {
  return { ...defaultEntryItem }
}

function createDefaultEntryForm(): EntryFormState {
  return {
    items: [createEmptyEntryItem()],
    note: '',
  }
}

function getProductLabel(product: Product) {
  const variant = [product.size, product.color].filter(Boolean).join(' · ')
  return `${product.name}${variant ? ` · ${variant}` : ''} · Stock ${product.stock}`
}

export function InventoryPage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [entryForm, setEntryForm] = useState<EntryFormState>(() => createDefaultEntryForm())
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentFormState>(defaultAdjustmentForm)
  const [loading, setLoading] = useState(true)
  const [submittingEntry, setSubmittingEntry] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)

    const [categoriesResponse, suppliersResponse, productsResponse, movementsResponse] = await Promise.all([
      window.api.catalog.listCategories(),
      window.api.catalog.listSuppliers(),
      window.api.catalog.listProducts({
        search,
        categoryId: categoryFilter === 'all' ? null : Number(categoryFilter),
        supplierId: supplierFilter === 'all' ? null : Number(supplierFilter),
        active: 'all',
      }),
      window.api.inventory.listMovements(),
    ])

    if (!categoriesResponse.ok) {
      setError(getErrorMessage(categoriesResponse.error))
      setLoading(false)
      return
    }

    if (!suppliersResponse.ok) {
      setError(getErrorMessage(suppliersResponse.error))
      setLoading(false)
      return
    }

    if (!productsResponse.ok) {
      setError(getErrorMessage(productsResponse.error))
      setLoading(false)
      return
    }

    if (!movementsResponse.ok) {
      setError(getErrorMessage(movementsResponse.error))
      setLoading(false)
      return
    }

    setCategories(categoriesResponse.data)
    setSuppliers(suppliersResponse.data)
    setProducts(productsResponse.data)
    setMovements(movementsResponse.data)
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    void loadData()
  }, [search, categoryFilter, supplierFilter])

  const handleEntryItemChange = (index: number, field: keyof EntryItemFormState, value: string) => {
    setEntryForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }))
  }

  const handleAddEntryItem = () => {
    setEntryForm((current) => ({
      ...current,
      items: [...current.items, createEmptyEntryItem()],
    }))
  }

  const handleRemoveEntryItem = (index: number) => {
    setEntryForm((current) => {
      if (current.items.length === 1) {
        return {
          ...current,
          items: [createEmptyEntryItem()],
        }
      }

      return {
        ...current,
        items: current.items.filter((_, itemIndex) => itemIndex !== index),
      }
    })
  }

  const handleEntrySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)
    setError(null)

    const parsed = stockEntrySchema.safeParse(entryForm)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisá la entrada de stock.')
      return
    }

    setSubmittingEntry(true)

    try {
      const response = await window.api.inventory.createEntry({
        items: parsed.data.items.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
        })),
        note: parsed.data.note || null,
      })

      if (!response.ok) {
        setError(getErrorMessage(response.error))
        return
      }

      setEntryForm(createDefaultEntryForm())
      setFeedback(`Se registraron ${response.data.processedCount} producto${response.data.processedCount === 1 ? '' : 's'} y el stock fue actualizado.`)
      await loadData()
    } finally {
      setSubmittingEntry(false)
    }
  }

  const handleAdjustmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)
    setError(null)

    const parsed = stockAdjustmentSchema.safeParse(adjustmentForm)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisá el ajuste manual.')
      return
    }

    const response = await window.api.inventory.createAdjustment({
      productId: Number(parsed.data.productId),
      delta: Number(parsed.data.delta),
      note: parsed.data.note,
    })

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    setAdjustmentForm(defaultAdjustmentForm)
    setFeedback('Ajuste manual aplicado y auditado.')
    await loadData()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Fase 5</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Inventario y movimientos</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          El stock no se “arregla” tocando un número. Se mueve con entradas, ventas y ajustes auditados. Si no, después nadie sabe qué pasó.
        </p>
        {error ? <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
        {feedback ? <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{feedback}</p> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-xl font-semibold text-white">Entrada de mercadería</h3>
            <p className="mt-1 text-sm text-slate-400">Sumá stock cuando llega reposición. Cada movimiento deja huella.</p>

            <form className="mt-5 space-y-3" onSubmit={handleEntrySubmit}>
              <div className="space-y-3">
                {entryForm.items.map((item, index) => {
                  const selectedProductIds = entryForm.items
                    .map((entryItem, entryIndex) => (entryIndex === index ? null : entryItem.productId))
                    .filter((productId): productId is string => Boolean(productId))

                  return (
                    <div key={`entry-item-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">Producto {index + 1}</p>
                        <button
                          type="button"
                          onClick={() => handleRemoveEntryItem(index)}
                          className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-800"
                        >
                          {entryForm.items.length === 1 ? 'Limpiar' : 'Quitar'}
                        </button>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px]">
                        <label className="block space-y-2 text-sm text-slate-300">
                          <span>Producto</span>
                          <select
                            value={item.productId}
                            onChange={(event) => handleEntryItemChange(index, 'productId', event.target.value)}
                            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                          >
                            <option value="">Seleccioná un producto</option>
                            {products.map((product) => {
                              const isSelectedInAnotherRow = selectedProductIds.includes(String(product.id))

                              return (
                                <option key={product.id} value={product.id} disabled={isSelectedInAnotherRow}>
                                  {getProductLabel(product)}
                                </option>
                              )
                            })}
                          </select>
                        </label>

                        <label className="block space-y-2 text-sm text-slate-300">
                          <span>Cantidad</span>
                          <input
                            value={item.quantity}
                            onChange={(event) => handleEntryItemChange(index, 'quantity', event.target.value)}
                            inputMode="numeric"
                            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                            placeholder="12"
                          />
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={handleAddEntryItem}
                className="w-full rounded-2xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
              >
                + Agregar otro producto
              </button>

              <label className="block space-y-2 text-sm text-slate-300">
                <span>Referencia / nota</span>
                <textarea value={entryForm.note} onChange={(event) => setEntryForm((current) => ({ ...current, note: event.target.value }))} className="min-h-24 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Ej: Remito 328 / proveedor mayorista" />
              </label>

              <button type="submit" disabled={submittingEntry} className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70">
                {submittingEntry ? 'Registrando entrada...' : 'Registrar entrada'}
              </button>
            </form>
          </div>

          {user?.role === 'admin' ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <h3 className="text-xl font-semibold text-white">Ajuste manual</h3>
              <p className="mt-1 text-sm text-slate-400">Solo admin: para mermas, correcciones o incidentes. Acá el motivo es OBLIGATORIO.</p>

              <form className="mt-5 space-y-3" onSubmit={handleAdjustmentSubmit}>
                <label className="block space-y-2 text-sm text-slate-300">
                  <span>Producto</span>
                  <select value={adjustmentForm.productId} onChange={(event) => setAdjustmentForm((current) => ({ ...current, productId: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400">
                    <option value="">Seleccioná un producto</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} · Stock {product.stock}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2 text-sm text-slate-300">
                  <span>Delta</span>
                  <input value={adjustmentForm.delta} onChange={(event) => setAdjustmentForm((current) => ({ ...current, delta: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="-2 o 5" />
                </label>

                <label className="block space-y-2 text-sm text-slate-300">
                  <span>Motivo</span>
                  <textarea value={adjustmentForm.note} onChange={(event) => setAdjustmentForm((current) => ({ ...current, note: event.target.value }))} className="min-h-24 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Ej: rotura detectada en conteo físico" />
                </label>

                <button type="submit" className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 font-medium text-amber-100 transition hover:bg-amber-500/20">
                  Aplicar ajuste
                </button>
              </form>
            </div>
          ) : null}
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="grid gap-3 lg:grid-cols-3">
              <label className="space-y-2 text-sm text-slate-300">
                <span className="block">Buscar</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Producto o categoría" />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span className="block">Categoría</span>
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400">
                  <option value="all">Todas</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span className="block">Proveedor</span>
                <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400">
                  <option value="all">Todos</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-xl font-semibold text-white">Stock disponible</h3>
            <p className="mt-1 text-sm text-slate-400">Los productos con menos de 5 unidades quedan marcados para reposición rápida.</p>

            {loading ? <p className="mt-5 text-sm text-slate-400">Cargando inventario...</p> : null}

            <div className="mt-5 space-y-3">
              {!loading && products.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">No hay productos para este filtro.</p> : null}
              {products.map((product) => (
                <article key={product.id} className={`rounded-2xl border p-4 ${product.stock < 5 ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800 bg-slate-950/70'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-medium text-white">{product.name}</h4>
                      <p className="text-sm text-slate-400">
                        {product.categoryName} · {product.supplierName ?? 'Sin proveedor'} · {product.active ? 'Activo' : 'Inactivo'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${product.stock < 5 ? 'text-amber-200' : 'text-emerald-300'}`}>Stock {product.stock}</p>
                      {product.stock < 5 ? <p className="text-xs text-amber-200">Reposición sugerida</p> : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-xl font-semibold text-white">Movimientos recientes</h3>
            <div className="mt-5 space-y-3">
              {movements.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">Todavía no hay movimientos registrados.</p> : null}
              {movements.map((movement) => (
                <article key={movement.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium text-white">{movement.productName}</h4>
                        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{movement.categoryName}</span>
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{getReasonLabel(movement.reason)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">{formatDate(movement.createdAt)} · {movement.userName}</p>
                      {movement.note ? <p className="mt-2 text-sm text-slate-300">{movement.note}</p> : null}
                    </div>
                    <span className={`rounded-full px-3 py-2 text-sm font-semibold ${movement.delta > 0 ? 'bg-emerald-500/10 text-emerald-200' : 'bg-rose-500/10 text-rose-200'}`}>
                      {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                    </span>
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
