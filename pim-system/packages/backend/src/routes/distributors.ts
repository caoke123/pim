/** packages/backend/src/routes/distributors.ts — 分销商管理路由 */

import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import crypto from 'node:crypto'
import { db } from '../db'
import { distributors } from '../db/schema'
import type { ApiResponse } from '@yuntu/shared'

const distributorsApp = new Hono()

function toNum(val: string | null): number | null {
  if (val === null) return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

/** 生成安全的 api_token */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/** 将 decimal 转为字符串（Drizzle decimal 写入时用 string） */
function toDecimalStr(val: number | null | undefined): string | null {
  if (val === null || val === undefined) return null
  return String(val)
}

/** 将 DB 记录映射为 camelCase 响应 */
function mapDistributor(row: typeof distributors.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    apiToken: row.apiToken,
    allowedCategories: row.allowedCategories,
    priceType: row.priceType,
    priceMarkup: toNum(row.priceMarkup as string),
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  }
}

// ── GET /api/v1/distributors ──────────────────────────────────────────────

distributorsApp.get('/', async (c) => {
  try {
    const rows = await db.select().from(distributors)
    const response: ApiResponse<ReturnType<typeof mapDistributor>[]> = {
      data: rows.map(mapDistributor),
    }
    return c.json(response)
  } catch (error) {
    console.error('获取分销商列表失败:', error)
    return c.json({ data: null, error: '获取分销商列表失败' }, 500)
  }
})

// ── POST /api/v1/distributors ─────────────────────────────────────────────

distributorsApp.post('/', async (c) => {
  try {
    const body = await c.req.json()

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return c.json({ data: null, error: '分销商名称不能为空' }, 400)
    }

    const [created] = await db
      .insert(distributors)
      .values({
        name: body.name.trim(),
        contact: body.contact ?? null,
        apiToken: generateToken(),
        allowedCategories: body.allowedCategories ?? null,
        priceType: body.priceType ?? 'selling',
        priceMarkup: toDecimalStr(body.priceMarkup) ?? '0',
        isActive: body.isActive ?? true,
      })
      .returning()

    const response: ApiResponse<ReturnType<typeof mapDistributor>> = {
      data: mapDistributor(created),
    }
    return c.json(response, 201)
  } catch (error) {
    console.error('创建分销商失败:', error)
    return c.json({ data: null, error: '创建分销商失败' }, 500)
  }
})

// ── PATCH /api/v1/distributors/:id ────────────────────────────────────────

distributorsApp.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()

    const [existing] = await db
      .select()
      .from(distributors)
      .where(eq(distributors.id, id))
      .limit(1)

    if (!existing) {
      return c.json({ data: null, error: '分销商不存在' }, 404)
    }

    // 只允许修改指定字段
    const allowedFields = ['name', 'contact', 'allowedCategories', 'priceType', 'priceMarkup', 'isActive'] as const
    const updateData: Record<string, unknown> = {}

    for (const key of allowedFields) {
      if (key in body && body[key] !== undefined) {
        if (key === 'priceMarkup') {
          updateData.priceMarkup = toDecimalStr(body[key] as number)
        } else {
          updateData[key] = body[key]
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      const response: ApiResponse<ReturnType<typeof mapDistributor>> = {
        data: mapDistributor(existing),
      }
      return c.json(response)
    }

    const [updated] = await db
      .update(distributors)
      .set(updateData)
      .where(eq(distributors.id, id))
      .returning()

    const response: ApiResponse<ReturnType<typeof mapDistributor>> = {
      data: mapDistributor(updated),
    }
    return c.json(response)
  } catch (error) {
    console.error('更新分销商失败:', error)
    return c.json({ data: null, error: '更新分销商失败' }, 500)
  }
})

// ── POST /api/v1/distributors/:id/regenerate-token ────────────────────────

distributorsApp.post('/:id/regenerate-token', async (c) => {
  try {
    const id = c.req.param('id')

    const [existing] = await db
      .select()
      .from(distributors)
      .where(eq(distributors.id, id))
      .limit(1)

    if (!existing) {
      return c.json({ data: null, error: '分销商不存在' }, 404)
    }

    const newToken = generateToken()

    const [updated] = await db
      .update(distributors)
      .set({ apiToken: newToken })
      .where(eq(distributors.id, id))
      .returning()

    const response: ApiResponse<ReturnType<typeof mapDistributor>> = {
      data: mapDistributor(updated),
    }
    return c.json(response)
  } catch (error) {
    console.error('重新生成 token 失败:', error)
    return c.json({ data: null, error: '重新生成 token 失败' }, 500)
  }
})

export { distributorsApp as distributorsRoutes }
