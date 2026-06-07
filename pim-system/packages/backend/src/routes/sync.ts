/** packages/backend/src/routes/sync.ts — 同步日志查询路由 */
import { Hono } from 'hono'
import { desc, eq } from 'drizzle-orm'
import { db, schema } from '../shared/db'

const { syncLogs } = schema
const syncApp = new Hono()

function nu(val: number | null): number {
  return val ?? 0
}

interface SyncLogItem {
  id: string
  trigger: string
  totalScanned: number
  newCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
  status: string
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
}

// GET /api/v1/sync/status
syncApp.get('/status', async (c) => {
  try {
    const [currentLog] = await db
      .select()
      .from(syncLogs)
      .where(eq(syncLogs.status, 'running'))
      .orderBy(desc(syncLogs.startedAt))
      .limit(1)

    const isRunning = !!currentLog

    const mappedLog: SyncLogItem | null = currentLog
      ? {
          id: currentLog.id,
          trigger: currentLog.trigger,
          totalScanned: nu(currentLog.totalScanned),
          newCount: nu(currentLog.newCount),
          updatedCount: nu(currentLog.updatedCount),
          skippedCount: nu(currentLog.skippedCount),
          failedCount: nu(currentLog.failedCount),
          status: currentLog.status,
          errorMessage: currentLog.errorMessage,
          startedAt: currentLog.startedAt.toISOString(),
          completedAt: currentLog.completedAt?.toISOString() ?? null,
        }
      : null

    return c.json({ data: { isRunning, currentLog: mappedLog } })
  } catch (error) {
    console.error('获取同步状态失败:', error)
    return c.json({ data: null, error: '获取同步状态失败' }, 500)
  }
})

// GET /api/v1/sync/logs
syncApp.get('/logs', async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query('page')) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize')) || 20))

    const logs = await db
      .select()
      .from(syncLogs)
      .orderBy(desc(syncLogs.startedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    const items: SyncLogItem[] = logs.map((log) => ({
      id: log.id,
      trigger: log.trigger,
      totalScanned: nu(log.totalScanned),
      newCount: nu(log.newCount),
      updatedCount: nu(log.updatedCount),
      skippedCount: nu(log.skippedCount),
      failedCount: nu(log.failedCount),
      status: log.status,
      errorMessage: log.errorMessage,
      startedAt: log.startedAt.toISOString(),
      completedAt: log.completedAt?.toISOString() ?? null,
    }))

    return c.json({ data: { items, total: items.length, page, pageSize } })
  } catch (error) {
    console.error('获取同步日志失败:', error)
    return c.json({ data: null, error: '获取同步日志失败' }, 500)
  }
})

// GET /api/v1/sync/logs/:id
syncApp.get('/logs/:id', async (c) => {
  try {
    const id = c.req.param('id')

    const [log] = await db
      .select()
      .from(syncLogs)
      .where(eq(syncLogs.id, id))
      .limit(1)

    if (!log) {
      return c.json({ data: null, error: '同步日志不存在' }, 404)
    }

    const item: SyncLogItem = {
      id: log.id,
      trigger: log.trigger,
      totalScanned: nu(log.totalScanned),
      newCount: nu(log.newCount),
      updatedCount: nu(log.updatedCount),
      skippedCount: nu(log.skippedCount),
      failedCount: nu(log.failedCount),
      status: log.status,
      errorMessage: log.errorMessage,
      startedAt: log.startedAt.toISOString(),
      completedAt: log.completedAt?.toISOString() ?? null,
    }

    return c.json({ data: item })
  } catch (error) {
    console.error('获取同步日志详情失败:', error)
    return c.json({ data: null, error: '获取同步日志详情失败' }, 500)
  }
})

export { syncApp as syncRoutes }
