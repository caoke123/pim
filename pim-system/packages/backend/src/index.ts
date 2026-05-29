/** packages/backend/src/index.ts — Hono 应用入口 */

import './load-env'

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { productsRoutes } from './routes/products'
import { syncRoutes } from './routes/sync'
import { exportsRoutes } from './routes/exports'
import { distributorsRoutes } from './routes/distributors'
import { distributorApiRoutes } from './routes/distributor-api'
import { statsRoutes } from './routes/stats'
import { serve } from '@hono/node-server'

const app = new Hono()

// ── CORS 中间件 ───────────────────────────────────────────────────────────

app.use('/*', cors({
  origin: process.env.CORS_ORIGINS || 'http://localhost:3000',
}))

// ── 请求日志中间件（仅打印方法 + 路径 + 耗时）────────────────────────────

app.use('/*', logger((message: string, ...rest: string[]) => {
  // 简洁日志：METHOD /path 200 12ms
  console.log(message)
}))

// ── 全局错误处理中间件 ────────────────────────────────────────────────────

app.onError((err, c) => {
  console.error('未捕获异常:', err)
  return c.json({
    data: null,
    error: '服务器内部错误',
  }, 500)
})

// ── 注册路由 ──────────────────────────────────────────────────────────────

app.route('/api/v1/products', productsRoutes)
app.route('/api/v1/sync', syncRoutes)
app.route('/api/v1/exports', exportsRoutes)
app.route('/api/v1/distributors', distributorsRoutes)
app.route('/api/v1/distributor', distributorApiRoutes)
app.route('/api/v1/stats', statsRoutes)

// ── 健康检查 ──────────────────────────────────────────────────────────────

app.get('/api/v1/health', (c) => c.json({ status: 'ok' }))

// ── 启动服务器 ────────────────────────────────────────────────────────────

const port = Number(process.env.PORT) || 8000

console.log(`
╔════════════════════════════════════════╗
║  雨图饰品 PIM 中台系统                     ║
║  Server: http://localhost:${port}          ║
║  API:    http://localhost:${port}/api/v1   ║
╚════════════════════════════════════════╝
`)

serve({
  fetch: app.fetch,
  port,
})

export default app
