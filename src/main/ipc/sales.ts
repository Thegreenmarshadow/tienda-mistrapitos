import { ipcMain } from 'electron'
import { z } from 'zod'
import { IPC } from '../../shared/ipc-channels'
import { salesService } from '../services/sales.service'

const SearchProductsSchema = z.object({
  search: z.string().trim().optional(),
})

const CheckoutSchema = z.object({
  customerId: z.number().int().positive().nullable().optional(),
  paymentMethod: z.enum(['cash', 'card', 'transfer']),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
})

const GetTicketSchema = z.object({
  saleId: z.number().int().positive(),
})

function normalizeError(error: unknown) {
  if (error instanceof z.ZodError) {
    return 'validation_error'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'unknown_error'
}

export function registerSalesHandlers() {
  ipcMain.handle(IPC.sales.searchProducts, async (_event, rawFilters) => {
    try {
      const filters = SearchProductsSchema.parse(rawFilters ?? {})
      const products = await salesService.searchProducts(filters.search)
      return { ok: true, data: products }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.sales.getTicket, async (_event, rawInput) => {
    try {
      const input = GetTicketSchema.parse(rawInput)
      const ticket = await salesService.getTicket(input.saleId)
      return { ok: true, data: ticket }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.sales.checkout, async (_event, rawInput) => {
    try {
      const input = CheckoutSchema.parse(rawInput)
      const ticket = await salesService.checkout(input)
      return { ok: true, data: ticket }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })
}
