/** packages/backend/src/index.ts — Hono 应用入口 (V3 稳定层) */

import './load-env'

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { syncRoutes } from './routes/sync'
import { exportsRoutes } from './routes/exports'
import { distributorsRoutes } from './routes/distributors'
import { distributorApiRoutes } from './routes/distributor-api'
import { statsRoutes } from './routes/stats'
import { productsRoutesV3 } from './modules/products'
import { publishRoutes } from './modules/publish'
import { logsRoutes } from './modules/logs/logs.routes'
import { catalogsRoutes } from './modules/catalogs'
import { distributionsModule } from './modules/distributions'
import { deployRoutes } from './modules/deploy/deploy.routes'
import { requestIdMiddleware } from './shared/utils'
import { globalErrorHandler } from './shared/middleware'
import { logger } from './shared/utils/logger'
import { serve } from '@hono/node-server'
import type { AppVariables } from './shared/hono'

const app = new Hono<{ Variables: AppVariables }>()

// ── RequestId 中间件 (最优先) ──────────────────────────────────────────────

app.use('/*', requestIdMiddleware)

// ── CORS 中间件 ───────────────────────────────────────────────────────────

app.use('/*', cors({
  origin: process.env.CORS_ORIGINS || 'http://localhost:5173',
}))

// ── 全局错误处理中间件 ────────────────────────────────────────────────────

app.onError(globalErrorHandler)

// ── 注册路由 ──────────────────────────────────────────────────────────────

app.route('/api/v1/products', productsRoutesV3)
app.route('/api/v1/publish', publishRoutes)
app.route('/api/v1/logs', logsRoutes)
app.route('/api/v1/catalogs', catalogsRoutes)
app.route('/api/v1/distributions', distributionsModule)
app.route('/api/v1/sync', syncRoutes)
app.route('/api/v1/exports', exportsRoutes)
app.route('/api/v1/distributors', distributorsRoutes)
app.route('/api/v1/distributor', distributorApiRoutes)
app.route('/api/v1/stats', statsRoutes)
app.route('/api/v1/deploy', deployRoutes)

// ── 健康检查 ──────────────────────────────────────────────────────────────

app.get('/api/v1/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    requestId: c.get('requestId'),
  })
})

// ── 启动服务器 ────────────────────────────────────────────────────────────

const port = Number(process.env.PORT) || 8000

logger.info({ port }, '雨图饰品 PIM 中台系统启动')
console.log(`
╔════════════════════════════════════════╗
║  雨图饰品 PIM 中台系统  V3              ║
║  Server: http://localhost:${port}          ║
║  API:    http://localhost:${port}/api/v1   ║
╚════════════════════════════════════════╝
`)

// ── 定时清理超时发布任务 (每5分钟) ──────────────────────────────────────

import { publishTasksRepository } from './repositories/publish-tasks.repository'

setInterval(async () => {
  try {
    const tasks = await publishTasksRepository.findMany({ pageSize: 100 })
    const now = new Date()
    for (const task of tasks.items) {
      if (task.status === 'running' && task.createdAt) {
        const elapsed = now.getTime() - new Date(task.createdAt).getTime()
        if (elapsed > 30 * 60 * 1000) {
          await publishTasksRepository.updateStatus(task.id, {
            status: 'failed',
            error: '任务超时',
          })
          logger.warn({ taskId: task.id }, '超时任务已标记为失败')
        }
      }
    }
  } catch (err) {
    logger.error(err, '定时清理超时任务失败')
  }
}, 5 * 60 * 1000)

logger.info(' 超时任务清理已启动 (每5分钟)')

// ── Supabase 定时同步 (Docker → Supabase 镜像) ────────────────────────────

import { startSupabaseSync } from './services/supabase-sync'
startSupabaseSync().catch((err) => logger.error(err, 'Supabase 同步启动失败'))

serve({
  fetch: app.fetch,
  port,
})

export default app
