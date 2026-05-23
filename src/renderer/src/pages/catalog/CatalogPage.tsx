import { useEffect, useMemo, useState } from 'react'
import type { Category, Product, ProductFilters, Supplier } from '../../../../shared/types'
import { categoryFormSchema, productFormSchema } from '@/features/catalog/schemas'

type CategoryFormState = {
  name: string
}

type ProductFormState = {
  name: string
  sku: string
  description: string
  categoryId: string
  supplierId: string
  size: string
  color: string
  price: string
  initialStock: string
}

const defaultCategoryForm: CategoryFormState = {
  name: '',
}

const defaultProductForm: ProductFormState = {
  name: '',
  sku: '',
  description: '',
  categoryId: '',
  supplierId: '',
  size: '',
  color: '',
  price: '',
  initialStock: '0',
}

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(valueInCents / 100)
}

function getErrorMessage(error: string) {
  switch (error) {
    case 'category_name_taken':
      return 'Ya existe una categoría con ese nombre.'
    case 'category_in_use':
      return 'No puedes borrar una categoría que ya tiene productos asociados.'
    case 'supplier_inactive':
      return 'No puedes asociar un proveedor inactivo a un producto.'
    case 'sku_taken':
      return 'Ya existe un producto con ese SKU.'
    case 'category_not_found':
      return 'La categoría seleccionada ya no existe. Vuelve a cargar la lista.'
    case 'validation_error':
      return 'Hay datos no válidos en el formulario. Revísalos e inténtalo de nuevo.'
    case 'forbidden':
      return 'Tu rol no tiene permiso para operar el catálogo.'
    case 'unauthorized':
      return 'La sesión expiró. Vuelve a iniciar sesión.'
    default:
      return 'Ocurrió un problema al guardar en el catálogo. Revisa los datos e inténtalo nuevamente.'
  }
}

export function CatalogPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(defaultCategoryForm)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const [productForm, setProductForm] = useState<ProductFormState>(defaultProductForm)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const activeSuppliers = useMemo(() => suppliers.filter((supplier) => supplier.active), [suppliers])

  async function loadCatalog(filters?: ProductFilters) {
    setLoading(true)
    setError(null)

    const [categoriesResponse, suppliersResponse, productsResponse] = await Promise.all([
      window.api.catalog.listCategories(),
      window.api.catalog.listSuppliers(),
      window.api.catalog.listProducts(
        filters ?? {
          search,
          categoryId: categoryFilter === 'all' ? null : Number(categoryFilter),
          supplierId: supplierFilter === 'all' ? null : Number(supplierFilter),
          active: activeFilter,
        },
      ),
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

    setCategories(categoriesResponse.data)
    setSuppliers(suppliersResponse.data)
    setProducts(productsResponse.data)
    setLoading(false)
  }

  useEffect(() => {
    void loadCatalog()
  }, [])

  useEffect(() => {
    void loadCatalog({
      search,
      categoryId: categoryFilter === 'all' ? null : Number(categoryFilter),
      supplierId: supplierFilter === 'all' ? null : Number(supplierFilter),
      active: activeFilter,
    })
  }, [activeFilter, categoryFilter, search, supplierFilter])

  const startEditingCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryForm({ name: category.name })
    setFeedback(null)
    setError(null)
  }

  const resetCategoryForm = () => {
    setEditingCategory(null)
    setCategoryForm(defaultCategoryForm)
  }

  const startEditingProduct = (product: Product) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      sku: product.sku ?? '',
      description: product.description ?? '',
      categoryId: String(product.categoryId),
      supplierId: product.supplierId ? String(product.supplierId) : '',
      size: product.size ?? '',
      color: product.color ?? '',
      price: (product.priceInCents / 100).toFixed(2),
      initialStock: String(product.stock),
    })
    setFeedback(null)
    setError(null)
  }

  const resetProductForm = () => {
    setEditingProduct(null)
    setProductForm(defaultProductForm)
  }

  const handleCategorySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)
    setError(null)

    const parsed = categoryFormSchema.safeParse(categoryForm)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa el formulario de categoría.')
      return
    }

    const response = editingCategory
      ? await window.api.catalog.updateCategory({ id: editingCategory.id, name: parsed.data.name })
      : await window.api.catalog.createCategory({ name: parsed.data.name })

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    resetCategoryForm()
    setFeedback(editingCategory ? 'Categoría actualizada.' : 'Categoría creada.')
    await loadCatalog()
  }

  const handleDeleteCategory = async (category: Category) => {
    if (!window.confirm(`¿Seguro que deseas borrar la categoría "${category.name}"?`)) {
      return
    }

    setFeedback(null)
    setError(null)

    const response = await window.api.catalog.deleteCategory({ id: category.id })

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    if (editingCategory?.id === category.id) {
      resetCategoryForm()
    }

    setFeedback('Categoría eliminada.')
    await loadCatalog()
  }

  const handleProductSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)
    setError(null)

    const parsed = productFormSchema.safeParse(productForm)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa el formulario del producto.')
      return
    }

    const payload = {
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      description: parsed.data.description || null,
      categoryId: Number(parsed.data.categoryId),
      supplierId: parsed.data.supplierId ? Number(parsed.data.supplierId) : null,
      size: parsed.data.size || null,
      color: parsed.data.color || null,
      priceInCents: Math.round(Number(parsed.data.price) * 100),
    }

    const response = editingProduct
      ? await window.api.catalog.updateProduct({ id: editingProduct.id, ...payload })
      : await window.api.catalog.createProduct({
          ...payload,
          initialStock: Number(parsed.data.initialStock),
        })

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    resetProductForm()
    setFeedback(editingProduct ? 'Producto actualizado.' : 'Producto creado.')
    await loadCatalog()
  }

  const handleToggleProduct = async (product: Product) => {
    setFeedback(null)
    setError(null)

    const response = await window.api.catalog.setProductActive({ id: product.id, active: !product.active })

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    if (editingProduct?.id === product.id) {
      resetProductForm()
    }

    setFeedback(product.active ? 'Producto desactivado.' : 'Producto reactivado.')
    await loadCatalog()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Fase 2</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Catálogo, categorías y stock visible</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Aquí se gestionan las categorías, proveedores y productos del catálogo con control de stock visible y edición segura.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            {products.length} producto{products.length === 1 ? '' : 's'} en vista actual
          </div>
        </div>

        {error ? <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
        {feedback ? <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{feedback}</p> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Categorías</h3>
                <p className="mt-1 text-sm text-slate-400">Registro y edición con nombre único. Si una categoría tiene productos asociados, no se puede eliminar.</p>
              </div>
              {editingCategory ? (
                <button type="button" onClick={resetCategoryForm} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
                  Cancelar edición
                </button>
              ) : null}
            </div>

            <form className="mt-5 space-y-3" onSubmit={handleCategorySubmit}>
              <label className="block space-y-2 text-sm text-slate-300">
                <span>Nombre</span>
                <input
                  value={categoryForm.name}
                  onChange={(event) => setCategoryForm({ name: event.target.value })}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                  placeholder="Ej: Camisetas"
                />
              </label>

              <button type="submit" className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-emerald-400">
                {editingCategory ? 'Guardar cambios' : 'Crear categoría'}
              </button>
            </form>

            <div className="mt-6 space-y-3">
              {categories.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">Aún no hay categorías. Crea al menos una para habilitar el registro de productos.</p> : null}

              {categories.map((category) => (
                <article key={category.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-medium text-white">{category.name}</h4>
                      <p className="text-sm text-slate-400">{category.productsCount} producto{category.productsCount === 1 ? '' : 's'} asociados</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEditingCategory(category)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800">
                        Editar
                      </button>
                      <button type="button" onClick={() => void handleDeleteCategory(category)} className="rounded-xl border border-rose-500/30 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/10">
                        Borrar
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Productos</h3>
                <p className="mt-1 text-sm text-slate-400">Alta con stock inicial, edición sin tocar stock directo y desactivación para preservar historial.</p>
              </div>
              {editingProduct ? (
                <button type="button" onClick={resetProductForm} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
                  Cancelar edición
                </button>
              ) : null}
            </div>

            <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleProductSubmit}>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Nombre</span>
                <input value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Jean wide leg" />
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                <span>SKU / Código</span>
                <input value={productForm.sku} onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value.toUpperCase() }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="JEAN-WIDE-NEG-42" />
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                <span>Categoría</span>
                <select value={productForm.categoryId} onChange={(event) => setProductForm((current) => ({ ...current, categoryId: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400">
                  <option value="">Seleccionar categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                <span>Descripción</span>
                <textarea value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} className="min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Tela, fit, observaciones de catálogo..." />
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                <span>Proveedor</span>
                <select value={productForm.supplierId} onChange={(event) => setProductForm((current) => ({ ...current, supplierId: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400">
                  <option value="">Sin proveedor</option>
                  {activeSuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                <span>Precio</span>
                <input type="number" min="0.01" step="0.01" value={productForm.price} onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="0.00" />
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                <span>Talla</span>
                <input value={productForm.size} onChange={(event) => setProductForm((current) => ({ ...current, size: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="M / 42 / Única" />
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                <span>Color</span>
                <input value={productForm.color} onChange={(event) => setProductForm((current) => ({ ...current, color: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Negro" />
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                <span>{editingProduct ? 'Stock actual' : 'Stock inicial'}</span>
                <input type="number" min="0" step="1" disabled={Boolean(editingProduct)} value={productForm.initialStock} onChange={(event) => setProductForm((current) => ({ ...current, initialStock: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none disabled:cursor-not-allowed disabled:opacity-60 focus:border-emerald-400" />
              </label>

              <div className="md:col-span-2">
                <button type="submit" disabled={loading || categories.length === 0} className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">
                  {editingProduct ? 'Guardar cambios del producto' : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="grid gap-4 xl:grid-cols-[2fr_repeat(3,1fr)]">
              <label className="space-y-2 text-sm text-slate-300">
                <span>Búsqueda</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Nombre, categoría o SKU" />
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                <span>Categoría</span>
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400">
                  <option value="all">Todas</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                <span>Proveedor</span>
                <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400">
                  <option value="all">Todos</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                <span>Estado</span>
                <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as 'all' | 'active' | 'inactive')} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400">
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </label>
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800">
              <div className="grid grid-cols-[2.2fr_1.1fr_1fr_0.8fr_0.8fr_1fr] gap-3 bg-slate-950/90 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                <span>Producto</span>
                <span>Categoría</span>
                <span>Proveedor</span>
                <span>Precio</span>
                <span>Stock</span>
                <span>Acciones</span>
              </div>

              {loading ? <p className="px-4 py-6 text-sm text-slate-400">Cargando catálogo...</p> : null}

              {!loading && products.length === 0 ? <p className="px-4 py-6 text-sm text-slate-400">No hay productos para esos filtros.</p> : null}

              <div className="divide-y divide-slate-800 bg-slate-900/60">
                {products.map((product) => (
                  <article key={product.id} className="grid grid-cols-[2.2fr_1.1fr_1fr_0.8fr_0.8fr_1fr] gap-3 px-4 py-4 text-sm text-slate-200">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">{product.name}</p>
                        {product.sku ? <span className="rounded-full border border-sky-500/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200">SKU {product.sku}</span> : null}
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${product.active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
                          {product.active ? 'Activo' : 'Inactivo'}
                        </span>
                        {product.stock < 5 ? <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Stock bajo</span> : null}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{[product.size, product.color].filter(Boolean).join(' · ') || 'Sin variante declarada'}</p>
                      {product.description ? <p className="mt-2 line-clamp-2 text-xs text-slate-500">{product.description}</p> : null}
                    </div>
                    <span>{product.categoryName}</span>
                    <span>{product.supplierName ?? 'Sin proveedor'}</span>
                    <span>{formatCurrency(product.priceInCents)}</span>
                    <span>{product.stock}</span>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => startEditingProduct(product)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800">
                        Editar
                      </button>
                      <button type="button" onClick={() => void handleToggleProduct(product)} className={`rounded-xl border px-3 py-2 text-xs ${product.active ? 'border-rose-500/30 text-rose-200 hover:bg-rose-500/10' : 'border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10'}`}>
                        {product.active ? 'Desactivar' : 'Reactivar'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
