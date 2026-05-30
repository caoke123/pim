/** modules/logs/logs.routes.ts — 日志路由 */

import { Hono } from 'hono'
import { eq, desc, count, sql } from 'drizzle-orm'
import { db, schema } from '../../shared/db'
import { ok, okPaginated, serverError } from '../../shared/utils'

const { operationLogs } = schema

const logsApp = new Hono()

// ── GET /api/v1/logs/operations ───────────────────────────────────────────

logsApp.get('/operations', async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query('page')) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize')) || 20))
    const level = c.req.query('level') || undefined

    const conditions = level ? [eq(operationLogs.level, level)] : []

    const [totalRow] = await db.select({ count: count() }).from(operationLogs)
    const total = totalRow?.count ?? 0

    const rows = await db
      .select()
      .from(operationLogs)
      .orderBy(desc(operationLogs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    const items = rows.map(r => ({
      id: r.id,
      operator: r.operator,
      spuCode: r.spuCode,
      productId: r.productId,
      action: r.action,
      fieldName: r.fieldName,
      oldValue: r.oldValue,
      newValue: r.newValue,
      level: r.level,
      message: r.message,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }))

    return okPaginated(c, items, total, page, pageSize)
  } catch (error) {
    return serverError(c, error)
  }
})

export { logsApp as logsRoutes }
