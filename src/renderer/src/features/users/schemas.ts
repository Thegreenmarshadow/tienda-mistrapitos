import { z } from 'zod'

export const createUserSchema = z.object({
  username: z.string().trim().min(3, 'El usuario debe tener al menos 3 caracteres.').max(30, 'El usuario no puede superar los 30 caracteres.'),
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(80, 'El nombre no puede superar los 80 caracteres.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(80, 'La contraseña no puede superar los 80 caracteres.'),
  role: z.enum(['admin', 'vendor', 'stock']),
})

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(80, 'El nombre no puede superar los 80 caracteres.'),
  role: z.enum(['admin', 'vendor', 'stock']),
})

export const resetUserPasswordSchema = z.object({
  newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres.').max(80, 'La nueva contraseña no puede superar los 80 caracteres.'),
  confirmPassword: z.string().min(8, 'Confirmá la nueva contraseña.'),
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
})
