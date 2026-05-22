import { and, asc, count, desc, eq, like, or, sql } from 'drizzle-orm'
import type {
  Category,
  CreateCategoryInput,
  CreateProductInput,
  CreateSupplierInput,
  DeleteCategoryInput,
  Product,
  ProductFilters,
  SetProductActiveInput,
  SetSupplierActiveInput,
  Supplier,
  UpdateCategoryInput,
  UpdateProductInput,
  UpdateSupplierInput,
} from '../../shared/types'
import { getDb } from '../db/client'
import { categories, products, stockMovements, suppliers } from '../db/schema'
import { requireAuth, requireRole } from '../session'
import { writeAuditLog } from './audit.service'

function requireCatalogAccess() {
  const user = requireAuth()
  return requireRole(user, ['admin', 'stock'])
}

function normalizeText(value?: string | null) {
  const normalized = value?.trim() ?? ''
  return normalized.length > 0 ? normalized : null
}

function normalizeSku(value?: string | null) {
  const normalized = value?.trim().toUpperCase() ?? ''
  return normalized.length > 0 ? normalized : null
}

async function getCategoryById(categoryId: number) {
  const db = getDb()
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId),
  })

  if (!category) {
    throw new Error('category_not_found')
  }

  return category
}

async function getSupplierById(supplierId: number) {
  const db = getDb()
  const supplier = await db.query.suppliers.findFirst({
    where: eq(suppliers.id, supplierId),
  })

  if (!supplier) {
    throw new Error('supplier_not_found')
  }

  return supplier
}

async function getProductBySku(sku: string, excludeProductId?: number) {
  const db = getDb()

  return db.query.products.findFirst({
    where: excludeProductId
      ? and(eq(products.sku, sku), sql`${products.id} <> ${excludeProductId}`)
      : eq(products.sku, sku),
  })
}

function mapCategory(row: Category): Category {
  return row
}

function mapSupplier(row: Supplier): Supplier {
  return row
}

export const catalogService = {
  async listCategories() {
    requireCatalogAccess()
    const db = getDb()

    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        productsCount: count(products.id),
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
      })
      .from(categories)
      .leftJoin(products, eq(products.categoryId, categories.id))
      .groupBy(categories.id)
      .orderBy(asc(categories.name))

    return rows.map((row) => mapCategory({ ...row, productsCount: Number(row.productsCount) }))
  },

  async createCategory(input: CreateCategoryInput) {
    requireCatalogAccess()
    const db = getDb()
    const name = input.name.trim()

    const existing = await db.query.categories.findFirst({
      where: eq(categories.name, name),
    })

    if (existing) {
      throw new Error('category_name_taken')
    }

    const result = await db.insert(categories).values({ name }).returning()
    const category = result[0]

    await writeAuditLog({
      action: 'create',
      entity: 'category',
      entityId: category.id,
      payload: { name: category.name },
    })

    return category
  },

  async updateCategory(input: UpdateCategoryInput) {
    requireCatalogAccess()
    const db = getDb()
    const name = input.name.trim()
    await getCategoryById(input.id)

    const duplicate = await db.query.categories.findFirst({
      where: and(eq(categories.name, name), sql`${categories.id} <> ${input.id}`),
    })

    if (duplicate) {
      throw new Error('category_name_taken')
    }

    const result = await db
      .update(categories)
      .set({ name })
      .where(eq(categories.id, input.id))
      .returning()

    const category = result[0]

    await writeAuditLog({
      action: 'update',
      entity: 'category',
      entityId: category.id,
      payload: { name: category.name },
    })

    return category
  },

  async deleteCategory(input: DeleteCategoryInput) {
    requireCatalogAccess()
    const db = getDb()
    const category = await getCategoryById(input.id)

    const linkedProduct = await db.query.products.findFirst({
      where: eq(products.categoryId, input.id),
    })

    if (linkedProduct) {
      throw new Error('category_in_use')
    }

    await db.delete(categories).where(eq(categories.id, input.id))

    await writeAuditLog({
      action: 'delete',
      entity: 'category',
      entityId: category.id,
      payload: { name: category.name },
    })

    return { id: input.id }
  },

  async listSuppliers() {
    requireCatalogAccess()
    const db = getDb()

    const rows = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        phone: suppliers.phone,
        email: suppliers.email,
        active: suppliers.active,
        productsCount: count(products.id),
        createdAt: suppliers.createdAt,
        updatedAt: suppliers.updatedAt,
      })
      .from(suppliers)
      .leftJoin(products, eq(products.supplierId, suppliers.id))
      .groupBy(suppliers.id)
      .orderBy(desc(suppliers.active), asc(suppliers.name))

    return rows.map((row) => mapSupplier({ ...row, productsCount: Number(row.productsCount) }))
  },

  async createSupplier(input: CreateSupplierInput) {
    requireCatalogAccess()
    const db = getDb()

    const result = await db
      .insert(suppliers)
      .values({
        name: input.name.trim(),
        phone: normalizeText(input.phone),
        email: normalizeText(input.email),
      })
      .returning()

    const supplier = result[0]

    await writeAuditLog({
      action: 'create',
      entity: 'supplier',
      entityId: supplier.id,
      payload: { name: supplier.name, phone: supplier.phone, email: supplier.email },
    })

    return supplier
  },

  async updateSupplier(input: UpdateSupplierInput) {
    requireCatalogAccess()
    const db = getDb()
    await getSupplierById(input.id)

    const result = await db
      .update(suppliers)
      .set({
        name: input.name.trim(),
        phone: normalizeText(input.phone),
        email: normalizeText(input.email),
      })
      .where(eq(suppliers.id, input.id))
      .returning()

    const supplier = result[0]

    await writeAuditLog({
      action: 'update',
      entity: 'supplier',
      entityId: supplier.id,
      payload: { name: supplier.name, phone: supplier.phone, email: supplier.email },
    })

    return supplier
  },

  async setSupplierActive(input: SetSupplierActiveInput) {
    requireCatalogAccess()
    const db = getDb()
    const supplier = await getSupplierById(input.id)

    const result = await db
      .update(suppliers)
      .set({ active: input.active })
      .where(eq(suppliers.id, input.id))
      .returning()

    const updatedSupplier = result[0]

    await writeAuditLog({
      action: input.active ? 'activate' : 'deactivate',
      entity: 'supplier',
      entityId: supplier.id,
      payload: { name: supplier.name },
    })

    return updatedSupplier
  },

  async listProducts(filters: ProductFilters = {}): Promise<Product[]> {
    requireCatalogAccess()
    const db = getDb()
    const conditions = []

    const search = filters.search?.trim()
    if (search) {
      const term = `%${search}%`
      conditions.push(or(like(products.name, term), like(categories.name, term), like(products.sku, term)))
    }

    if (typeof filters.categoryId === 'number') {
      conditions.push(eq(products.categoryId, filters.categoryId))
    }

    if (typeof filters.supplierId === 'number') {
      conditions.push(eq(products.supplierId, filters.supplierId))
    }

    if (filters.active === 'active') {
      conditions.push(eq(products.active, true))
    }

    if (filters.active === 'inactive') {
      conditions.push(eq(products.active, false))
    }

    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        description: products.description,
        categoryId: products.categoryId,
        categoryName: categories.name,
        supplierId: products.supplierId,
        supplierName: suppliers.name,
        size: products.size,
        color: products.color,
        priceInCents: products.price,
        stock: products.stock,
        active: products.active,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .leftJoin(suppliers, eq(suppliers.id, products.supplierId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(products.active), asc(products.name), asc(products.id))

    return rows
  },

  async createProduct(input: CreateProductInput) {
    const user = requireCatalogAccess()
    const db = getDb()

    await getCategoryById(input.categoryId)

    const normalizedSku = normalizeSku(input.sku)

    if (normalizedSku) {
      const existingBySku = await getProductBySku(normalizedSku)

      if (existingBySku) {
        throw new Error('sku_taken')
      }
    }

    if (typeof input.supplierId === 'number') {
      const supplier = await getSupplierById(input.supplierId)
      if (!supplier.active) {
        throw new Error('supplier_inactive')
      }
    }

    const createdProduct = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(products)
        .values({
          name: input.name.trim(),
          sku: normalizedSku,
          description: normalizeText(input.description),
          categoryId: input.categoryId,
          supplierId: input.supplierId ?? null,
          size: normalizeText(input.size),
          color: normalizeText(input.color),
          price: input.priceInCents,
          stock: 0,
          active: true,
        })
        .returning()

      const product = inserted[0]

      if (input.initialStock > 0) {
        await tx.insert(stockMovements).values({
          productId: product.id,
          userId: user.id,
          delta: input.initialStock,
          reason: 'entry',
          note: 'Stock inicial de catálogo',
        })

        await tx.update(products).set({ stock: input.initialStock }).where(eq(products.id, product.id))
      }

      return product
    })

    await writeAuditLog({
      action: 'create',
      entity: 'product',
      entityId: createdProduct.id,
      payload: {
        name: createdProduct.name,
        sku: createdProduct.sku,
        categoryId: input.categoryId,
        supplierId: input.supplierId ?? null,
        priceInCents: input.priceInCents,
        initialStock: input.initialStock,
      },
    })

    return createdProduct
  },

  async updateProduct(input: UpdateProductInput) {
    requireCatalogAccess()
    const db = getDb()

    const currentProduct = await db.query.products.findFirst({
      where: eq(products.id, input.id),
    })

    if (!currentProduct) {
      throw new Error('product_not_found')
    }

    const normalizedSku = normalizeSku(input.sku)

    if (normalizedSku) {
      const existingBySku = await getProductBySku(normalizedSku, input.id)

      if (existingBySku) {
        throw new Error('sku_taken')
      }
    }

    await getCategoryById(input.categoryId)

    if (typeof input.supplierId === 'number') {
      const supplier = await getSupplierById(input.supplierId)
      if (!supplier.active) {
        throw new Error('supplier_inactive')
      }
    }

    const result = await db
      .update(products)
      .set({
        name: input.name.trim(),
        sku: normalizedSku,
        description: normalizeText(input.description),
        categoryId: input.categoryId,
        supplierId: input.supplierId ?? null,
        size: normalizeText(input.size),
        color: normalizeText(input.color),
        price: input.priceInCents,
      })
      .where(eq(products.id, input.id))
      .returning()

    const product = result[0]

    await writeAuditLog({
      action: 'update',
      entity: 'product',
      entityId: product.id,
      payload: {
        previous: {
          name: currentProduct.name,
          sku: currentProduct.sku,
          categoryId: currentProduct.categoryId,
          supplierId: currentProduct.supplierId,
          priceInCents: currentProduct.price,
        },
        next: {
          name: product.name,
          sku: product.sku,
          categoryId: product.categoryId,
          supplierId: product.supplierId,
          priceInCents: product.price,
        },
      },
    })

    return product
  },

  async setProductActive(input: SetProductActiveInput) {
    requireCatalogAccess()
    const db = getDb()

    const currentProduct = await db.query.products.findFirst({
      where: eq(products.id, input.id),
    })

    if (!currentProduct) {
      throw new Error('product_not_found')
    }

    const result = await db
      .update(products)
      .set({ active: input.active })
      .where(eq(products.id, input.id))
      .returning()

    const product = result[0]

    await writeAuditLog({
      action: input.active ? 'activate' : 'deactivate',
      entity: 'product',
      entityId: product.id,
      payload: { name: product.name },
    })

    return product
  },
}
