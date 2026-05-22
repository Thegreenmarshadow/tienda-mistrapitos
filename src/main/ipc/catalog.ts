import { ipcMain } from 'electron'
import { z } from 'zod'
import { IPC } from '../../shared/ipc-channels'
import { catalogService } from '../services/catalog.service'

function normalizeError(error: unknown) {
  if (error instanceof z.ZodError) {
    return 'validation_error'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'unknown_error'
}

const nullableTrimmedText = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== 'string') {
      return null
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
  })

const nullableSkuText = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== 'string') {
      return null
    }

    const normalized = value.trim().toUpperCase()
    return normalized.length > 0 ? normalized : null
  })
  .refine((value) => !value || value.length <= 64, 'invalid_sku')

const CategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
})

const CategoryUpdateSchema = CategorySchema.extend({
  id: z.number().int().positive(),
})

const CategoryDeleteSchema = z.object({
  id: z.number().int().positive(),
})

const SupplierSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: nullableTrimmedText,
  email: nullableTrimmedText.refine((value) => !value || z.email().safeParse(value).success, 'invalid_email'),
})

const SupplierUpdateSchema = SupplierSchema.extend({
  id: z.number().int().positive(),
})

const SetSupplierActiveSchema = z.object({
  id: z.number().int().positive(),
  active: z.boolean(),
})

const ProductSchema = z.object({
  name: z.string().trim().min(1).max(160),
  sku: nullableSkuText,
  description: nullableTrimmedText,
  categoryId: z.number().int().positive(),
  supplierId: z.number().int().positive().nullable().optional(),
  size: nullableTrimmedText,
  color: nullableTrimmedText,
  priceInCents: z.number().int().positive(),
  initialStock: z.number().int().min(0),
})

const ProductUpdateSchema = ProductSchema.omit({ initialStock: true }).extend({
  id: z.number().int().positive(),
})

const SetProductActiveSchema = z.object({
  id: z.number().int().positive(),
  active: z.boolean(),
})

const ProductFiltersSchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  supplierId: z.number().int().positive().nullable().optional(),
  active: z.enum(['all', 'active', 'inactive']).optional(),
})

export function registerCatalogHandlers() {
  ipcMain.handle(IPC.catalog.listCategories, async () => {
    try {
      return { ok: true, data: await catalogService.listCategories() }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.catalog.createCategory, async (_event, rawInput) => {
    try {
      const input = CategorySchema.parse(rawInput)
      return { ok: true, data: await catalogService.createCategory(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.catalog.updateCategory, async (_event, rawInput) => {
    try {
      const input = CategoryUpdateSchema.parse(rawInput)
      return { ok: true, data: await catalogService.updateCategory(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.catalog.deleteCategory, async (_event, rawInput) => {
    try {
      const input = CategoryDeleteSchema.parse(rawInput)
      return { ok: true, data: await catalogService.deleteCategory(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.catalog.listSuppliers, async () => {
    try {
      return { ok: true, data: await catalogService.listSuppliers() }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.catalog.createSupplier, async (_event, rawInput) => {
    try {
      const input = SupplierSchema.parse(rawInput)
      return { ok: true, data: await catalogService.createSupplier(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.catalog.updateSupplier, async (_event, rawInput) => {
    try {
      const input = SupplierUpdateSchema.parse(rawInput)
      return { ok: true, data: await catalogService.updateSupplier(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.catalog.setSupplierActive, async (_event, rawInput) => {
    try {
      const input = SetSupplierActiveSchema.parse(rawInput)
      return { ok: true, data: await catalogService.setSupplierActive(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.catalog.listProducts, async (_event, rawInput) => {
    try {
      const input = ProductFiltersSchema.parse(rawInput ?? {})
      return { ok: true, data: await catalogService.listProducts(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.catalog.createProduct, async (_event, rawInput) => {
    try {
      const input = ProductSchema.parse(rawInput)
      return { ok: true, data: await catalogService.createProduct(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.catalog.updateProduct, async (_event, rawInput) => {
    try {
      const input = ProductUpdateSchema.parse(rawInput)
      return { ok: true, data: await catalogService.updateProduct(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.catalog.setProductActive, async (_event, rawInput) => {
    try {
      const input = SetProductActiveSchema.parse(rawInput)
      return { ok: true, data: await catalogService.setProductActive(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })
}
