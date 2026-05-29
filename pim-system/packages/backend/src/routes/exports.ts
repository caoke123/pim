/** packages/backend/src/routes/exports.ts — 多平台导出路由 */

import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db'
import { exportRecords } from '../db/schema'
import { generateShopeeExcel } from '../services/export/shopee'
import { generateTemuExcel } from '../services/export/temu'
import { generateMiaoshouExcel } from '../services/export/miaoshou'
import type { ApiResponse, PaginatedResponse, Platform } from '@yuntu/shared'

const exportsApp = new Hono()

const MAX_PRODUCTS = 200
const PLATFORMS: Platform[] = ['shopee', 'temu', 'miaoshou']

// 生成文件名
function generateFileName(platform: string): string {
  const date = new Date()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${platform}_export_${y}${m}${d}.xlsx`
}

// ── POST /api/v1/exports/:platform ────────────────────────────────────────

for (const platform of PLATFORMS) {
  exportsApp.post(`/${platform}`, async (c) => {
    try {
      const body = await c.req.json()
      const productIds: string[] = body.productIds || []

      if (!Array.isArray(productIds) || productIds.length === 0) {
        return c.json({ data: null, error: '请至少选择一个产品' }, 400)
      }
      if (productIds.length > MAX_PRODUCTS) {
        return c.json({ data: null, error: `最多同时导出 ${MAX_PRODUCTS} 个产品` }, 400)
      }

      let buffer: Buffer

      switch (platform) {
        case 'shopee':
          buffer = await generateShopeeExcel(productIds, body.options)
          break
        case 'temu':
          buffer = await generateTemuExcel(productIds, body.options)
          break
        case 'miaoshou':
          buffer = await generateMiaoshouExcel(productIds, body.options)
          break
        default:
          return c.json({ data: null, error: '不支持的平台' }, 400)
      }

      // 写入导出记录
      const fileName = generateFileName(platform)
      await db.insert(exportRecords).values({
        platform,
        productIds,
        fileName,
        fileUrl: null,
        exportedBy: 'admin',
      })

      // 返回文件流
      const fileHeaders = new Headers()
      fileHeaders.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      fileHeaders.set('Content-Disposition', `attachment; filename="${fileName}"`)
      const fileBody = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
      return new Response(fileBody, { status: 200, headers: fileHeaders })
    } catch (error) {
      console.error(`导出 ${platform} 失败:`, error)
      return c.json({ data: null, error: `导出失败: ${String(error)}` }, 500)
    }
  })
}

// ── GET /api/v1/exports/records ───────────────────────────────────────────

exportsApp.get('/records', async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query('page')) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize')) || 20))
    const platform = c.req.query('platform')

    const records = await db
      .select()
      .from(exportRecords)
      .orderBy(desc(exportRecords.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    const filtered = platform
      ? records.filter((r) => r.platform === platform)
      : records

    const items = filtered.map((r) => ({
      id: r.id,
      platform: r.platform,
      productIds: r.productIds,
      fileName: r.fileName,
      fileUrl: r.fileUrl,
      exportedBy: r.exportedBy,
      createdAt: r.createdAt.toISOString(),
    }))

    const response: ApiResponse<PaginatedResponse<typeof items[number]>> = {
      data: { items, total: items.length, page, pageSize },
    }
    return c.json(response)
  } catch (error) {
    console.error('获取导出记录失败:', error)
    return c.json({ data: null, error: '获取导出记录失败' }, 500)
  }
})

export { exportsApp as exportsRoutes }
