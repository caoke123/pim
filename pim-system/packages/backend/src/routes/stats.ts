/** packages/backend/src/routes/stats.ts — 统计相关路由 */

import { Hono } from 'hono'
import { eq, desc, count, sql } from 'drizzle-orm'
import { db } from '../db'
import { products, syncLogs, productPlatforms } from '../db/schema'
import type { ApiResponse } from '@yuntu/shared'

const statsApp = new Hono()

// ── GET /api/v1/stats/overview ────────────────────────────────────────────

statsApp.get('/overview', async (c) => {
  try {
    // 产品总数
    const [totalResult] = await db.select({ count: count() }).from(products)
    const totalProducts = totalResult?.count ?? 0

    // 各状态数量
    const [pendingResult] = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.status, 'pending'))
    const [activeResult] = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.status, 'active'))

    // 最后同步时间（从 sync_logs 取最近一条 done 记录）
    const [lastSync] = await db
      .select({ completedAt: syncLogs.completedAt })
      .from(syncLogs)
      .where(eq(syncLogs.status, 'done'))
      .orderBy(desc(syncLogs.completedAt))
      .limit(1)

    // 各平台导出统计（从 product_platforms 按 export_status='exported' 计数）
    const platforms = ['shopee', 'temu', 'miaoshou'] as const
    const exportStats: Record<string, { total: number; lastExportedAt: string | null }> = {}

    for (const platform of platforms) {
      const [totalResult] = await db
        .select({ count: count() })
        .from(productPlatforms)
        .where(eq(productPlatforms.platform, platform))

      const [lastExport] = await db
        .select({ lastExportedAt: productPlatforms.lastExportedAt })
        .from(productPlatforms)
        .where(eq(productPlatforms.platform, platform))
        .orderBy(desc(productPlatforms.lastExportedAt))
        .limit(1)

      exportStats[platform] = {
        total: totalResult?.count ?? 0,
        lastExportedAt: lastExport?.lastExportedAt?.toISOString() ?? null,
      }
    }

    const response: ApiResponse<{
      totalProducts: number
      pendingProducts: number
      activeProducts: number
      lastSyncedAt: string | null
      exportStats: Record<string, { total: number; lastExportedAt: string | null }>
    }> = {
      data: {
        totalProducts,
        pendingProducts: pendingResult?.count ?? 0,
        activeProducts: activeResult?.count ?? 0,
        lastSyncedAt: lastSync?.completedAt?.toISOString() ?? null,
        exportStats,
      },
    }

    return c.json(response)
  } catch (error) {
    console.error('获取概览统计失败:', error)
    return c.json({ data: null, error: '获取概览统计失败' }, 500)
  }
})

export { statsApp as statsRoutes }
