import { z } from 'zod'

const stockEntryItemSchema = z.object({
  productId: z.string().trim().min(1, 'Selecciona un producto para ingresar stock.'),
  quantity: z.string().trim().min(1, 'Indicá la cantidad que entra.'),
})

export const stockEntrySchema = z.object({
  items: z.array(stockEntryItemSchema).min(1, 'Agregá al menos un producto para registrar entrada.'),
  note: z.string().trim().max(240, 'La referencia no puede superar los 240 caracteres.').optional().or(z.literal('')),
}).superRefine((value, context) => {
  const selectedProducts = new Set<string>()

  value.items.forEach((item, index) => {
    const quantity = Number(item.quantity)

    if (!Number.isInteger(quantity) || quantity <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items', index, 'quantity'],
        message: 'La cantidad de entrada debe ser un entero positivo.',
      })
    }

    if (item.productId && selectedProducts.has(item.productId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items', index, 'productId'],
        message: 'No repitas el mismo producto en una sola entrada.',
      })
      return
    }

    if (item.productId) {
      selectedProducts.add(item.productId)
    }
  })
})

export const stockAdjustmentSchema = z.object({
  productId: z.string().trim().min(1, 'Selecciona un producto para ajustar.'),
  delta: z.string().trim().min(1, 'Indicá el delta del ajuste.'),
  note: z.string().trim().min(1, 'Explicá el motivo del ajuste.').max(240, 'El motivo no puede superar los 240 caracteres.'),
}).superRefine((value, context) => {
  const delta = Number(value.delta)

  if (!Number.isInteger(delta) || delta === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['delta'],
      message: 'El ajuste debe ser un entero distinto de cero.',
    })
  }
})
