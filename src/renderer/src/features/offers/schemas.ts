import { z } from 'zod'

export const offerFormSchema = z
  .object({
    productId: z.string().trim().min(1, 'Selecciona un producto.'),
    discountPercent: z.string().trim().min(1, 'Indicá el descuento.'),
    startAt: z.string().trim().min(1, 'Indicá cuándo arranca la oferta.'),
    endAt: z.string().trim().min(1, 'Indicá cuándo termina la oferta.'),
  })
  .superRefine((value, context) => {
    const discount = Number(value.discountPercent)

    if (!Number.isInteger(discount) || discount < 1 || discount > 99) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discountPercent'],
        message: 'El descuento debe ser un entero entre 1 y 99%.',
      })
    }

    const start = Date.parse(value.startAt)
    const end = Date.parse(value.endAt)

    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endAt'],
        message: 'La fecha fin tiene que ser posterior al inicio.',
      })
    }
  })
