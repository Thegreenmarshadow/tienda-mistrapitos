import bcrypt from 'bcrypt'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import type {
  CreateUserInput,
  ResetUserPasswordInput,
  SessionUser,
  SetUserActiveInput,
  UpdateUserInput,
  UserAccount,
} from '../../shared/types'
import { getDb } from '../db/client'
import { users, type UserRow } from '../db/schema'
import { clearSession, getCurrentUser, requireAuth, requireRole, setCurrentUser } from '../session'
import { writeAuditLog } from './audit.service'

function requireUsersAccess() {
  const user = requireAuth()
  return requireRole(user, ['admin'])
}

function mapUserAccount(user: UserRow): UserAccount {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

function toSessionUser(user: UserRow): SessionUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
  }
}

async function getUserById(userId: number) {
  const db = getDb()
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user) {
    throw new Error('user_not_found')
  }

  return user
}

async function ensureAnotherActiveAdminExists(excludedUserId: number) {
  const db = getDb()
  const remainingAdmin = await db.query.users.findFirst({
    where: and(
      eq(users.active, true),
      eq(users.role, 'admin'),
      sql`${users.id} <> ${excludedUserId}`,
    ),
  })

  if (!remainingAdmin) {
    throw new Error('last_active_admin')
  }
}

function syncCurrentSession(user: UserRow) {
  const currentUser = getCurrentUser()

  if (!currentUser || currentUser.id !== user.id) {
    return
  }

  if (!user.active) {
    clearSession()
    return
  }

  setCurrentUser(toSessionUser(user))
}

export const usersService = {
  async list() {
    requireUsersAccess()
    const db = getDb()

    const rows = await db
      .select()
      .from(users)
      .orderBy(desc(users.active), asc(users.name), asc(users.username), asc(users.id))

    return rows.map(mapUserAccount)
  },

  async create(input: CreateUserInput) {
    requireUsersAccess()
    const db = getDb()
    const username = input.username.trim()
    const name = input.name.trim()

    const existing = await db.query.users.findFirst({
      where: eq(users.username, username),
    })

    if (existing) {
      throw new Error('username_taken')
    }

    const passwordHash = await bcrypt.hash(input.password, 10)
    const result = await db
      .insert(users)
      .values({
        username,
        name,
        passwordHash,
        role: input.role,
        active: true,
        mustChangePassword: false,
      })
      .returning()

    const createdUser = result[0]

    await writeAuditLog({
      action: 'create',
      entity: 'user',
      entityId: createdUser.id,
      payload: {
        username: createdUser.username,
        name: createdUser.name,
        role: createdUser.role,
        active: createdUser.active,
      },
    })

    return mapUserAccount(createdUser)
  },

  async update(input: UpdateUserInput) {
    requireUsersAccess()
    const db = getDb()
    const currentUser = await getUserById(input.id)
    const name = input.name.trim()

    if (currentUser.active && currentUser.role === 'admin' && input.role !== 'admin') {
      await ensureAnotherActiveAdminExists(currentUser.id)
    }

    const result = await db
      .update(users)
      .set({
        name,
        role: input.role,
      })
      .where(eq(users.id, input.id))
      .returning()

    const updatedUser = result[0]

    await writeAuditLog({
      action: 'update',
      entity: 'user',
      entityId: updatedUser.id,
      payload: {
        username: updatedUser.username,
        name: updatedUser.name,
        role: updatedUser.role,
        active: updatedUser.active,
      },
    })

    syncCurrentSession(updatedUser)

    return mapUserAccount(updatedUser)
  },

  async resetPassword(input: ResetUserPasswordInput) {
    requireUsersAccess()
    const db = getDb()
    const user = await getUserById(input.id)
    const passwordHash = await bcrypt.hash(input.newPassword, 10)

    const result = await db
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: true,
      })
      .where(eq(users.id, input.id))
      .returning()

    const updatedUser = result[0]

    await writeAuditLog({
      action: 'reset_password',
      entity: 'user',
      entityId: updatedUser.id,
      payload: {
        username: user.username,
        name: user.name,
        role: user.role,
      },
    })

    syncCurrentSession(updatedUser)

    return mapUserAccount(updatedUser)
  },

  async setActive(input: SetUserActiveInput) {
    requireUsersAccess()
    const db = getDb()
    const user = await getUserById(input.id)

    if (user.active && !input.active && user.role === 'admin') {
      await ensureAnotherActiveAdminExists(user.id)
    }

    const result = await db
      .update(users)
      .set({ active: input.active })
      .where(eq(users.id, input.id))
      .returning()

    const updatedUser = result[0]

    await writeAuditLog({
      action: input.active ? 'activate' : 'deactivate',
      entity: 'user',
      entityId: updatedUser.id,
      payload: {
        username: updatedUser.username,
        name: updatedUser.name,
        role: updatedUser.role,
        active: updatedUser.active,
      },
    })

    syncCurrentSession(updatedUser)

    return mapUserAccount(updatedUser)
  },
}
