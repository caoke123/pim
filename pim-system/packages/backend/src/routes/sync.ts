/** packages/backend/src/routes/sync.ts — R2 同步相关路由 */

import { Hono } from 'hono'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { syncLogs } from '../db/schema'
import { R2Service } from '../services/r2'
import { SyncService } from '../services/sync'
import type { ApiResponse, PaginatedResponse, SyncLogRecord } from '@yuntu/shared'

const syncApp = new Hono()

// 初始化服务单例
const r2Service = new R2Service()
const syncService = new SyncService(r2Service)

/** 导出供入口文件使用 */
export { r2Service, syncService }

/** 安全获取数值，null → 0 */
function nu(val: number | null): number {
  return val ?? 0
}

// ── POST /api/v1/sync/trigger ─────────────────────────────────────────────

syncApp.post('/trigger', async (c) => {
  try {
    const startedAt = new Date()

    // 创建同步日志记录
    const [log] = await db
      .insert(syncLogs)
      .values({
        trigger: 'manual',
        status: 'running',
        startedAt,
      })
      .returning()

    // 后台异步执行同步，不阻塞响应
    syncService.runSync('manual', log.id).catch((error) => {
      console.error('后台同步失败:', error)
    })

    const response: ApiResponse<{ message: string; logId: string }> = {
      data: { message: '同步已启动', logId: log.id },
    }
    return c.json(response)
  } catch (error) {
    console.error('触发同步失败:', error)
    return c.json({ data: null, error: '触发同步失败' }, 500)
  }
})

// ── GET /api/v1/sync/status ───────────────────────────────────────────────

syncApp.get('/status', async (c) => {
  try {
    const [currentLog] = await db
      .select()
      .from(syncLogs)
      .where(eq(syncLogs.status, 'running'))
      .orderBy(desc(syncLogs.startedAt))
      .limit(1)

    const isRunning = !!currentLog

    const mappedLog: SyncLogRecord | null = currentLog
      ? {
          id: currentLog.id,
          trigger: currentLog.trigger as 'auto' | 'manual',
          totalScanned: nu(currentLog.totalScanned),
          newCount: nu(currentLog.newCount),
          updatedCount: nu(currentLog.updatedCount),
          skippedCount: nu(currentLog.skippedCount),
          failedCount: nu(currentLog.failedCount),
          status: currentLog.status as 'running' | 'done' | 'failed',
          errorMessage: currentLog.errorMessage,
          startedAt: currentLog.startedAt.toISOString(),
          completedAt: currentLog.completedAt?.toISOString() ?? null,
        }
      : null

    return c.json({
      data: { isRunning, currentLog: mappedLog },
    })
  } catch (error) {
    console.error('获取同步状态失败:', error)
    return c.json({ data: null, error: '获取同步状态失败' }, 500)
  }
})

// ── GET /api/v1/sync/logs ─────────────────────────────────────────────────

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

    const items: SyncLogRecord[] = logs.map((log) => ({
      id: log.id,
      trigger: log.trigger as 'auto' | 'manual',
      totalScanned: nu(log.totalScanned),
      newCount: nu(log.newCount),
      updatedCount: nu(log.updatedCount),
      skippedCount: nu(log.skippedCount),
      failedCount: nu(log.failedCount),
      status: log.status as 'running' | 'done' | 'failed',
      errorMessage: log.errorMessage,
      startedAt: log.startedAt.toISOString(),
      completedAt: log.completedAt?.toISOString() ?? null,
    }))

    const response: ApiResponse<PaginatedResponse<SyncLogRecord>> = {
      data: { items, total: items.length, page, pageSize },
    }
    return c.json(response)
  } catch (error) {
    console.error('获取同步日志失败:', error)
    return c.json({ data: null, error: '获取同步日志失败' }, 500)
  }
})

// ── GET /api/v1/sync/test-connection ──────────────────────────────────────

syncApp.get('/test-connection', async (c) => {
  try {
    const result = await r2Service.testConnection()
    return c.json({
      data: { success: result.success, error: result.error },
    })
  } catch (error) {
    return c.json({
      data: { success: false, error: String(error) },
    })
  }
})

// ── GET /api/v1/sync/logs/:id ─────────────────────────────────────────────

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

    const item: SyncLogRecord = {
      id: log.id,
      trigger: log.trigger as 'auto' | 'manual',
      totalScanned: nu(log.totalScanned),
      newCount: nu(log.newCount),
      updatedCount: nu(log.updatedCount),
      skippedCount: nu(log.skippedCount),
      failedCount: nu(log.failedCount),
      status: log.status as 'running' | 'done' | 'failed',
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
