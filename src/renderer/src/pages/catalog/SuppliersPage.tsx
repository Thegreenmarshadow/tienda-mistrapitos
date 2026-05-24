import { useEffect, useMemo, useState } from 'react'
import type { Product, Supplier } from '../../../../shared/types'
import { supplierFormSchema } from '@/features/catalog/schemas'

type SupplierFormState = {
  name: string
  phone: string
  email: string
}

const defaultSupplierForm: SupplierFormState = {
  name: '',
  phone: '',
  email: '',
}

function getErrorMessage(error: string) {
  switch (error) {
    case 'validation_error':
      return 'Hay datos inválidos en el formulario del proveedor.'
    case 'supplier_not_found':
      return 'El proveedor ya no existe. Vuelve a cargar la pantalla.'
    case 'forbidden':
      return 'Tu rol no tiene permiso para gestionar proveedores.'
    default:
      return 'No se pudo guardar el proveedor. Revisa los datos e inténtalo de nuevo.'
  }
}

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null)
  const [supplierProducts, setSupplierProducts] = useState<Product[]>([])
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>(defaultSupplierForm)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === selectedSupplierId) ?? null,
    [selectedSupplierId, suppliers],
  )

  async function loadSuppliers(nextSelectedSupplierId?: number | null) {
    setLoading(true)

    const suppliersResponse = await window.api.catalog.listSuppliers()
    if (!suppliersResponse.ok) {
      setError(getErrorMessage(suppliersResponse.error))
      setLoading(false)
      return
    }

    const suppliersData = suppliersResponse.data
    setSuppliers(suppliersData)

    const supplierIdToLoad = nextSelectedSupplierId ?? selectedSupplierId ?? suppliersData[0]?.id ?? null
    setSelectedSupplierId(supplierIdToLoad)

    if (!supplierIdToLoad) {
      setSupplierProducts([])
      setLoading(false)
      return
    }

    const productsResponse = await window.api.catalog.listProducts({
      supplierId: supplierIdToLoad,
      active: 'all',
    })

    if (!productsResponse.ok) {
      setError(getErrorMessage(productsResponse.error))
      setLoading(false)
      return
    }

    setSupplierProducts(productsResponse.data)
    setLoading(false)
  }

  useEffect(() => {
    void loadSuppliers()
  }, [])

  useEffect(() => {
    if (!selectedSupplierId) {
      return
    }

    void loadSuppliers(selectedSupplierId)
  }, [selectedSupplierId])

  const resetForm = () => {
    setEditingSupplier(null)
    setSupplierForm(defaultSupplierForm)
  }

  const startEditing = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setSupplierForm({
      name: supplier.name,
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
    })
    setError(null)
    setFeedback(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setFeedback(null)

    const parsed = supplierFormSchema.safeParse(supplierForm)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa el formulario del proveedor.')
      return
    }

    const payload = {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
    }

    const response = editingSupplier
      ? await window.api.catalog.updateSupplier({ id: editingSupplier.id, ...payload })
      : await window.api.catalog.createSupplier(payload)

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    const selected = editingSupplier?.id ?? response.data.id
    resetForm()
    setFeedback(editingSupplier ? 'Proveedor actualizado.' : 'Proveedor creado.')
    await loadSuppliers(selected)
  }

  const handleToggleActive = async (supplier: Supplier) => {
    setError(null)
    setFeedback(null)

    const response = await window.api.catalog.setSupplierActive({
      id: supplier.id,
      active: !supplier.active,
    })

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    if (editingSupplier?.id === supplier.id) {
      resetForm()
    }

    setFeedback(supplier.active ? 'Proveedor desactivado.' : 'Proveedor reactivado.')
    await loadSuppliers(supplier.id)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-400"></p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Proveedores</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Aquí puedes registrar a los proveedores del negocio y consultar los productos asociados a cada uno.
        </p>
        {error ? <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
        {feedback ? <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{feedback}</p> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white">ABM de proveedores</h3>
               <p className="mt-1 text-sm text-slate-400">Registra nombre, teléfono y correo electrónico. Si deja de operar, puedes desactivarlo sin perder el historial.</p>
            </div>
            {editingSupplier ? (
              <button type="button" onClick={resetForm} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
                Cancelar edición
              </button>
            ) : null}
          </div>

          <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
            <label className="block space-y-2 text-sm text-slate-300">
              <span>Nombre</span>
              <input value={supplierForm.name} onChange={(event) => setSupplierForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Proveedor mayorista" />
            </label>

            <label className="block space-y-2 text-sm text-slate-300">
              <span>Teléfono</span>
              <input value={supplierForm.phone} onChange={(event) => setSupplierForm((current) => ({ ...current, phone: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="11 5555-1234" />
            </label>

            <label className="block space-y-2 text-sm text-slate-300">
              <span>Email</span>
              <input value={supplierForm.email} onChange={(event) => setSupplierForm((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="compras@proveedor.com" />
            </label>

            <button type="submit" className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-emerald-400">
              {editingSupplier ? 'Guardar cambios' : 'Crear proveedor'}
            </button>
          </form>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-xl font-semibold text-white">Listado</h3>
            <div className="mt-4 overflow-hidden rounded-3xl border border-slate-800">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_0.9fr_1fr] gap-3 bg-slate-950/90 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                <span>Proveedor</span>
                <span>Teléfono</span>
                <span>Email</span>
                <span>Productos</span>
                <span>Acciones</span>
              </div>

              {loading ? <p className="px-4 py-6 text-sm text-slate-400">Cargando proveedores...</p> : null}
              {!loading && suppliers.length === 0 ? <p className="px-4 py-6 text-sm text-slate-400">Aún no hay proveedores registrados.</p> : null}

              <div className="divide-y divide-slate-800 bg-slate-900/60">
                {suppliers.map((supplier) => (
                  <article key={supplier.id} className="grid grid-cols-[1.4fr_1fr_1fr_0.9fr_1fr] gap-3 px-4 py-4 text-sm text-slate-200">
                    <div>
                      <button type="button" onClick={() => setSelectedSupplierId(supplier.id)} className="text-left font-medium text-white underline-offset-4 hover:underline">
                        {supplier.name}
                      </button>
                      <p className="mt-1 text-xs text-slate-400">{supplier.active ? 'Activo' : 'Inactivo'}</p>
                    </div>
                    <span>{supplier.phone ?? '—'}</span>
                    <span>{supplier.email ?? '—'}</span>
                    <span>{supplier.productsCount}</span>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => startEditing(supplier)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800">
                        Editar
                      </button>
                      <button type="button" onClick={() => void handleToggleActive(supplier)} className={`rounded-xl border px-3 py-2 text-xs ${supplier.active ? 'border-rose-500/30 text-rose-200 hover:bg-rose-500/10' : 'border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10'}`}>
                        {supplier.active ? 'Desactivar' : 'Reactivar'}
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
                <h3 className="text-xl font-semibold text-white">Productos por proveedor</h3>
                <p className="mt-1 text-sm text-slate-400">Selecciona un proveedor del listado para revisar su catálogo asociado.</p>
              </div>
              {selectedSupplier ? <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">{selectedSupplier.name}</div> : null}
            </div>

            {!selectedSupplier ? <p className="mt-5 text-sm text-slate-400">Aún no hay un proveedor seleccionado.</p> : null}

            {selectedSupplier ? (
              <div className="mt-5 space-y-3">
                {supplierProducts.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">Este proveedor aún no tiene productos asociados.</p> : null}

                {supplierProducts.map((product) => (
                  <article key={product.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-medium text-white">{product.name}</h4>
                        <p className="text-sm text-slate-400">
                          {product.categoryName} · Stock {product.stock} · {product.active ? 'Activo' : 'Inactivo'}
                        </p>
                      </div>
                      <span className="text-sm text-slate-300">${(product.priceInCents / 100).toFixed(2)}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
