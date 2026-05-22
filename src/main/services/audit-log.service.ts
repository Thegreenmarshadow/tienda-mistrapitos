import { and, asc, count, desc, eq, gte, lte } from 'drizzle-orm'
import type { AuditLogEntry, AuditLogFilters, AuditLogPage, AuditLogUserOption } from '../../shared/types'
import { getDb } from '../db/client'
import { auditLog, users } from '../db/schema'
import { requireAuth, requireRole } from '../session'

function requireAuditAccess() {
  const user = requireAuth()
  return requireRole(user, ['admin'])
}

function safeParsePayload(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function normalizeDateStart(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} 00:00:00`
}

function normalizeDateEnd(value: string) {
  const date = new Date(`${value}T23:59:59.999`)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} 23:59:59`
}

export const auditLogService = {
  async list(filters: AuditLogFilters): Promise<AuditLogPage> {
    requireAuditAccess()
    const db = getDb()
    const page = filters.page && filters.page > 0 ? filters.page : 1
    const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 50) : 20
    const conditions = []

    if (typeof filters.userId === 'number') {
      conditions.push(eq(auditLog.userId, filters.userId))
    }

    if (filters.action) {
      conditions.push(eq(auditLog.action, filters.action))
    }

    if (filters.startDate) {
      conditions.push(gte(auditLog.createdAt, normalizeDateStart(filters.startDate)))
    }

    if (filters.endDate) {
      conditions.push(lte(auditLog.createdAt, normalizeDateEnd(filters.endDate)))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db
      .select({
        id: auditLog.id,
        createdAt: auditLog.createdAt,
        action: auditLog.action,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        terminalId: auditLog.terminalId,
        payload: auditLog.payload,
        userId: users.id,
        userName: users.name,
        username: users.username,
      })
      .from(auditLog)
      .innerJoin(users, eq(users.id, auditLog.userId))
      .where(where)
      .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    const totalRows = await db.select({ count: count() }).from(auditLog).where(where)
    const userOptions = await db
      .select({ id: users.id, name: users.name, username: users.username })
      .from(users)
      .orderBy(asc(users.name), asc(users.id))

    const actionRows = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .groupBy(auditLog.action)
      .orderBy(asc(auditLog.action))

    const items: AuditLogEntry[] = rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      terminalId: row.terminalId,
      payload: safeParsePayload(row.payload),
      user: {
        id: row.userId,
        name: row.userName,
        username: row.username,
      },
    }))

    return {
      items,
      page,
      pageSize,
      total: Number(totalRows[0]?.count ?? 0),
      availableActions: actionRows.map((row) => row.action),
      users: userOptions as AuditLogUserOption[],
    }
  },
}
