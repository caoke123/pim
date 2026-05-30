/** modules/publish/publish.routes.ts */

import { Hono } from 'hono'
import { eq, asc } from 'drizzle-orm'
import { publishTasksRepository } from '../../repositories/publish-tasks.repository'
import { sseManager } from '../../services/sse-manager'
import { ok, okPaginated, fail, serverError } from '../../shared/utils'
import { createRequestLogger } from '../../shared/utils/logger'
import { db, schema } from '../../shared/db'
import type { AppVariables } from '../../shared/hono'
import type { CreatePublishTaskDTO, AppendLogDTO, UpdateStatusDTO } from './publish.dto'
import type { ImagesJson } from '../../shared/types'

const { products, productSkus } = schema

const publishApp = new Hono<{ Variables: AppVariables }>()

// ── 组装完整产品数据 ────────────────────────────────────────────────────

interface PublishProductPayload {
  productNo: string
  internal: {
    title: string
    description: string | null
    category: string | null
  }
  platforms: Record<string, unknown>
  skus: PublishSkuPayload[]
  images: {
    main: { index: number; fileName: string; r2Url: string }[]
    detail: { index: number; fileName: string; r2Url: string }[]
  }
}

interface PublishSkuPayload {
  index: number
  skuCode: string
  nameZh: string | null
  nameEn: string | null
  weight: number | null
  size: unknown
  pricing: {
    cost: number | null
    selling: number | null
    currency: string
  }
  stock: number | null
  images: {
    primary: { r2Url: string | null; fileName: string }
  }
}

async function buildPublishPayload(productIds: string[]): Promise<PublishProductPayload[]> {
  const results: PublishProductPayload[] = []

  for (const productId of productIds) {
    const [product] = await db.select().from(products).where(
      eq(products.id, productId)
    ).limit(1)

    if (!product) continue

    const skus = await db.select().from(productSkus).where(
      eq(productSkus.spuCode, product.spuCode)
    ).orderBy(asc(productSkus.sortOrder))

    const imagesJson = product.imagesJson as ImagesJson | null
    const platformsJson = product.platformsJson as Record<string, unknown> | null

    const payload: PublishProductPayload = {
      productNo: product.spuCode,
      internal: {
        title: product.title,
        description: product.description,
        category: product.category,
      },
      platforms: {
        shopee: platformsJson?.shopee ?? null,
      },
      skus: skus.map(sku => ({
        index: sku.sortOrder ?? 0,
        skuCode: sku.skuCode,
        nameZh: sku.nameZhCustom ?? sku.nameZh,
        nameEn: sku.nameEnCustom ?? sku.nameEn,
        weight: sku.weightG ? Number(sku.weightG) : null,
        size: sku.sizeJson,
        pricing: {
          cost: sku.costPrice ? Number(sku.costPrice) : null,
          selling: sku.sellingPrice ? Number(sku.sellingPrice) : null,
          currency: 'CNY',
        },
        stock: sku.stock,
        images: {
          primary: {
            r2Url: sku.imageUrl,
            fileName: `${sku.skuCode}.jpg`,
          },
        },
      })),
      images: {
        main: (imagesJson?.main ?? []).map(img => ({
          index: img.index,
          fileName: img.fileName,
          r2Url: img.r2Url || '',
        })),
        detail: (imagesJson?.detail ?? []).map(img => ({
          index: img.index,
          fileName: img.fileName,
          r2Url: img.r2Url || '',
        })),
      },
    }

    // 验证数据完整性
    console.log('[BuildPayload] 验证字段:')
    console.log('  spuCode:', payload.productNo)
    console.log('  category:', payload.internal.category)
    console.log('  platforms.shopee:', payload.platforms.shopee ? 'present' : 'MISSING')
    if (payload.platforms.shopee) {
      const s = payload.platforms.shopee as any
      console.log('    category:', s.category)
      console.log('    invitation:', s.invitation?.code || 'NONE')
    }
    console.log('  skus count:', payload.skus.length)
    if (payload.skus[0]) {
      console.log('  skus[0].pricing.selling:', payload.skus[0].pricing.selling)
      console.log('  skus[0].pricing.cost:', payload.skus[0].pricing.cost)
      console.log('  skus[0].weight:', payload.skus[0].weight)
      console.log('  skus[0].stock:', payload.skus[0].stock)
    }

    results.push(payload)
  }

  return results
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/publish/tasks — 创建发布任务
// ═══════════════════════════════════════════════════════════════════════════════

publishApp.post('/tasks', async (c) => {
  const log = createRequestLogger(c.get('requestId'))
  try {
    const body: CreatePublishTaskDTO = await c.req.json()

    if (!body.platform || !body.productIds?.length) {
      return fail(c, 'platform 和 productIds 不能为空')
    }

    const task = await publishTasksRepository.create({
      platform: body.platform,
      productIds: body.productIds,
      status: 'pending',
      progress: 0,
      logLines: [],
      operator: 'XP',
    })

    const publishPayload = await buildPublishPayload(body.productIds)
    const callbackUrl = process.env.PIM_CALLBACK_URL || 'http://localhost:8000'

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const agentRes = await fetch('http://127.0.0.1:13000/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          platform: body.platform,
          callbackUrl: `${callbackUrl}/api/v1/publish`,
          product: publishPayload.length === 1 ? publishPayload[0] : null,
          products: publishPayload.length > 1 ? publishPayload : null,
          isBatch: publishPayload.length > 1,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!agentRes.ok) throw new Error(`Agent returned ${agentRes.status}`)

      await publishTasksRepository.updateStatus(task.id, { status: 'running' })
      log.info({ taskId: task.id, productCount: publishPayload.length }, '发布任务已发送至 Agent')

      return ok(c, { ...task, status: 'running' }, '发布任务已创建', 201)
    } catch (agentErr) {
      log.warn({ taskId: task.id }, '本地发布 Agent 未运行')
      await publishTasksRepository.updateStatus(task.id, {
        status: 'failed',
        error: '本地发布Agent未运行，请启动分拣系统',
      })
      return ok(c, {
        id: task.id,
        platform: body.platform,
        productIds: body.productIds,
        status: 'failed',
        progress: 0,
        logLines: [],
        error: '本地发布Agent未运行，请启动分拣系统',
        operator: 'XP',
      }, 'Agent 未运行，任务已标记为失败')
    }
  } catch (error) {
    return serverError(c, error)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/publish/tasks/:id/log — 追加日志行
// ═══════════════════════════════════════════════════════════════════════════════

publishApp.post('/tasks/:id/log', async (c) => {
  try {
    const id = c.req.param('id')
    const body: AppendLogDTO = await c.req.json()

    if (!body.nodeId || !body.message) {
      return fail(c, 'nodeId 和 message 不能为空')
    }

    const logEntry = {
      nodeId: body.nodeId,
      message: body.message,
      timestamp: new Date().toISOString(),
    }

    await publishTasksRepository.appendLogLine(id, logEntry)

    if (typeof body.progress === 'number') {
      await publishTasksRepository.updateStatus(id, { status: 'running', progress: body.progress })
    }

    sseManager.sendLog(id, logEntry)
    if (typeof body.progress === 'number') {
      sseManager.sendProgress(id, body.progress)
    }

    return ok(c, { logged: true })
  } catch (error) {
    return serverError(c, error)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/publish/tasks/:id/stream — SSE 实时日志流
// ═══════════════════════════════════════════════════════════════════════════════

publishApp.get('/tasks/:id/stream', async (c) => {
  const id = c.req.param('id')
  const task = await publishTasksRepository.findById(id)

  if (!task) {
    return fail(c, '任务不存在', 404)
  }

  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  sseManager.add(id, writer)

  const existingLogs = (task.logLines as any[]) || []
  for (const log of existingLogs) {
    writer.write(encoder.encode(`event: log\ndata: ${JSON.stringify(log)}\n\n`))
  }

  writer.write(encoder.encode(`event: progress\ndata: {"progress":${task.progress}}\n\n`))
  writer.write(encoder.encode(`event: status\ndata: {"status":"${task.status}"}\n\n`))

  c.req.raw.signal.addEventListener('abort', () => {
    sseManager.remove(id, writer)
    writer.close().catch(() => {})
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/publish/tasks/:id/status — Playwright 回调更新状态
// ═══════════════════════════════════════════════════════════════════════════════

publishApp.post('/tasks/:id/status', async (c) => {
  const log = createRequestLogger(c.get('requestId'))
  try {
    const id = c.req.param('id')
    const body: UpdateStatusDTO = await c.req.json()

    if (!body.status || !['success', 'failed'].includes(body.status)) {
      return fail(c, 'status 必须是 success 或 failed')
    }

    const updated = await publishTasksRepository.updateStatus(id, {
      status: body.status,
      error: body.error,
      completedAt: new Date(),
    })

    if (!updated) return fail(c, '任务不存在', 404)

    log.info({ taskId: id, status: body.status }, '发布任务状态更新')

    sseManager.sendStatus(id, body.status, body.error)

    return ok(c, updated)
  } catch (error) {
    return serverError(c, error)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/publish/tasks — 获取任务列表
// ═══════════════════════════════════════════════════════════════════════════════

publishApp.get('/tasks', async (c) => {
  try {
    const page = Number(c.req.query('page')) || 1
    const pageSize = Number(c.req.query('pageSize')) || 20
    const status = c.req.query('status') || undefined

    const result = await publishTasksRepository.findMany({ page, pageSize, status })

    const items = result.items.map(t => ({
      id: t.id,
      platform: t.platform,
      productIds: t.productIds,
      status: t.status,
      progress: t.progress,
      logLines: t.logLines,
      error: t.error,
      operator: t.operator,
      createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
      completedAt: t.completedAt instanceof Date ? t.completedAt.toISOString() : null,
    }))

    return okPaginated(c, items, result.total, result.page, result.pageSize)
  } catch (error) {
    return serverError(c, error)
  }
})

export { publishApp as publishRoutes }
