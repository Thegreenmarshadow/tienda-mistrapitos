import { z } from 'zod'

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá un nombre').max(80, 'Máximo 80 caracteres'),
})

export const supplierFormSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá un nombre').max(120, 'Máximo 120 caracteres'),
  phone: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.email().safeParse(value).success, 'Ingresá un email válido'),
})

export const productFormSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá un nombre').max(160, 'Máximo 160 caracteres'),
  sku: z.string().trim().max(64, 'Máximo 64 caracteres').optional(),
  description: z.string().trim().optional(),
  categoryId: z.string().min(1, 'Selecciona una categoría'),
  supplierId: z.string().optional(),
  size: z.string().trim().optional(),
  color: z.string().trim().optional(),
  price: z
    .string()
    .min(1, 'Ingresá un precio')
    .refine((value) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) && parsed > 0
    }, 'El precio debe ser mayor a 0'),
  initialStock: z
    .string()
    .min(1, 'Ingresá el stock inicial')
    .refine((value) => {
      const parsed = Number(value)
      return Number.isInteger(parsed) && parsed >= 0
    }, 'El stock inicial debe ser un entero mayor o igual a 0'),
})
