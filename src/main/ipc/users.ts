import { ipcMain } from 'electron'
import { z } from 'zod'
import { IPC } from '../../shared/ipc-channels'
import { usersService } from '../services/users.service'

const CreateUserSchema = z.object({
  username: z.string().trim().min(3).max(30),
  name: z.string().trim().min(2).max(80),
  password: z.string().min(8).max(80),
  role: z.enum(['admin', 'vendor', 'stock']),
})

const UpdateUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(2).max(80),
  role: z.enum(['admin', 'vendor', 'stock']),
})

const ResetUserPasswordSchema = z.object({
  id: z.number().int().positive(),
  newPassword: z.string().min(8).max(80),
})

const SetUserActiveSchema = z.object({
  id: z.number().int().positive(),
  active: z.boolean(),
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

export function registerUserHandlers() {
  ipcMain.handle(IPC.users.list, async () => {
    try {
      return { ok: true, data: await usersService.list() }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.users.create, async (_event, rawInput) => {
    try {
      const input = CreateUserSchema.parse(rawInput)
      return { ok: true, data: await usersService.create(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.users.update, async (_event, rawInput) => {
    try {
      const input = UpdateUserSchema.parse(rawInput)
      return { ok: true, data: await usersService.update(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.users.resetPassword, async (_event, rawInput) => {
    try {
      const input = ResetUserPasswordSchema.parse(rawInput)
      return { ok: true, data: await usersService.resetPassword(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.users.setActive, async (_event, rawInput) => {
    try {
      const input = SetUserActiveSchema.parse(rawInput)
      return { ok: true, data: await usersService.setActive(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })
}
