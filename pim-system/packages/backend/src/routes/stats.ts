/** routes/stats.ts — 统计路由 (基于真实DB) */

import { Hono } from 'hono'
import { count } from 'drizzle-orm'
import { db, schema } from '../shared/db'
import { publishTasksRepository } from '../repositories/publish-tasks.repository'
import { ok, serverError } from '../shared/utils'

const { products } = schema

const statsApp = new Hono()

// ── GET /api/v1/stats/overview ────────────────────────────────────────────

statsApp.get('/overview', async (c) => {
  try {
    // 产品总数
    const [totalResult] = await db.select({ count: count() }).from(products)
    const totalProducts = totalResult?.count ?? 0

    // 各状态统计
    const statusRows = await db
      .select({ status: products.status, cnt: count() })
      .from(products)
      .groupBy(products.status)

    const statusMap: Record<string, number> = {}
    for (const row of statusRows) {
      statusMap[row.status] = row.cnt
    }

    const readyProducts = statusMap['ready'] ?? 0
    const activeProducts = statusMap['active'] ?? 0
    const pendingProducts = statusMap['pending'] ?? 0

    // 失败发布任务数
    let failedPublishTasks = 0
    try {
      failedPublishTasks = await publishTasksRepository.countFailed()
    } catch {
      failedPublishTasks = 0
    }

    // 平台统计: 从 platforms_json 提取
    const allProducts = await db
      .select({ platformsJson: products.platformsJson })
      .from(products)

    const platformStats: Record<string, { total: number; lastExportedAt: string | null }> = {}
    for (const p of allProducts) {
      if (p.platformsJson && typeof p.platformsJson === 'object') {
        const json = p.platformsJson as Record<string, unknown>
        for (const key of Object.keys(json)) {
          if (!platformStats[key]) {
            platformStats[key] = { total: 0, lastExportedAt: null }
          }
          platformStats[key].total++
        }
      }
    }

    return ok(c, {
      totalProducts,
      readyProducts,
      activeProducts,
      pendingProducts,
      failedPublishTasks,
      lastSyncedAt: null,
      platformStats: Object.entries(platformStats).map(([platform, stats]) => ({
        platform,
        total: stats.total,
        lastExportedAt: stats.lastExportedAt,
      })),
    })
  } catch (error) {
    return serverError(c, error)
  }
})

export { statsApp as statsRoutes }
