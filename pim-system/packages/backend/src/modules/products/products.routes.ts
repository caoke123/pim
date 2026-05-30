/** modules/products/products.routes.ts — 产品 API 路由 (zod + error + logger + typed context) */

import { Hono } from 'hono'
import { productsService } from './products.service'
import { AppError, ValidationError, NotFoundError, ErrorCode } from '../../shared/utils/errors'
import { createRequestLogger } from '../../shared/utils/logger'
import { ok, serverError } from '../../shared/utils/response'
import {
  productListQuerySchema,
  productIdParamSchema,
  productBasicUpdateSchema,
  skusUpdateSchema,
} from './products.schema'
import type { AppVariables } from '../../shared/hono'

const productsApp = new Hono<{ Variables: AppVariables }>()

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/products — 产品列表
// ═══════════════════════════════════════════════════════════════════════════════

productsApp.get('/', async (c) => {
  const requestId = c.get('requestId')
  const log = createRequestLogger(requestId)

  try {
    const raw = {
      page: c.req.query('page'),
      pageSize: c.req.query('pageSize'),
      keyword: c.req.query('keyword'),
      status: c.req.query('status'),
      platform: c.req.query('platform'),
      sortBy: c.req.query('sortBy'),
      order: c.req.query('order'),
    }

    const parsed = productListQuerySchema.safeParse(raw)
    if (!parsed.success) {
      throw new ValidationError(
        '查询参数校验失败',
        parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      )
    }

    log.info({ query: parsed.data }, '产品列表查询')

    const result = await productsService.getProductList(parsed.data)

    return ok(c, result, 'ok')
  } catch (error) {
    if (error instanceof ValidationError) {
      return c.json({
        success: false,
        error: { code: error.code, message: error.message, details: error.details },
        requestId,
        timestamp: new Date().toISOString(),
      }, 400)
    }
    return serverError(c, error)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/products/:id — 产品详情
// ═══════════════════════════════════════════════════════════════════════════════

productsApp.get('/:id', async (c) => {
  const requestId = c.get('requestId')
  const log = createRequestLogger(requestId)

  try {
    const params = productIdParamSchema.safeParse({ id: c.req.param('id') })
    if (!params.success) {
      throw new ValidationError(
        '产品 ID 格式无效',
        params.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      )
    }

    log.info({ productId: params.data.id }, '产品详情查询')

    const detail = await productsService.getProductDetail(params.data.id)

    if (!detail) {
      throw new NotFoundError(ErrorCode.PRODUCT_NOT_FOUND, '产品不存在')
    }

    return ok(c, detail, 'ok')
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return c.json({
        success: false,
        error: { code: error.code, message: error.message, details: error.details },
        requestId,
        timestamp: new Date().toISOString(),
      }, error instanceof NotFoundError ? 404 : 400)
    }
    return serverError(c, error)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/v1/products/:id/basic — 编辑基础信息
// ═══════════════════════════════════════════════════════════════════════════════

productsApp.patch('/:id/basic', async (c) => {
  const requestId = c.get('requestId')
  const log = createRequestLogger(requestId)

  try {
    const params = productIdParamSchema.safeParse({ id: c.req.param('id') })
    if (!params.success) {
      throw new ValidationError(
        '产品 ID 格式无效',
        params.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      )
    }

    const body = await c.req.json()
    const parsed = productBasicUpdateSchema.safeParse(body)

    if (!parsed.success) {
      throw new ValidationError(
        '请求体校验失败',
        parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      )
    }

    log.info({ productId: params.data.id, updates: parsed.data }, '编辑产品基础信息')

    const updated = await productsService.updateBasic(params.data.id, parsed.data)

    if (!updated) {
      throw new NotFoundError(ErrorCode.PRODUCT_NOT_FOUND, '产品不存在')
    }

    return ok(c, updated, '更新成功')
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({
        success: false,
        error: { code: error.code, message: error.message, details: error.details },
        requestId,
        timestamp: new Date().toISOString(),
      }, error.status as any)
    }
    return serverError(c, error)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/v1/products/:id/skus — 批量编辑 SKU
// ═══════════════════════════════════════════════════════════════════════════════

productsApp.patch('/:id/skus', async (c) => {
  const requestId = c.get('requestId')
  const log = createRequestLogger(requestId)

  try {
    const params = productIdParamSchema.safeParse({ id: c.req.param('id') })
    if (!params.success) {
      throw new ValidationError(
        '产品 ID 格式无效',
        params.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      )
    }

    const body = await c.req.json()
    const parsed = skusUpdateSchema.safeParse(body)

    if (!parsed.success) {
      throw new ValidationError(
        'SKU 更新数据校验失败',
        parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      )
    }

    log.info({ productId: params.data.id, skuCount: parsed.data.skus.length }, '批量编辑 SKU')

    const result = await productsService.updateSkus(params.data.id, parsed.data)

    if (!result) {
      throw new NotFoundError(ErrorCode.PRODUCT_NOT_FOUND, '产品不存在')
    }

    return ok(c, result, `成功更新 ${result.updated} 个 SKU, 失败 ${result.failed.length} 个`)
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({
        success: false,
        error: { code: error.code, message: error.message, details: error.details },
        requestId,
        timestamp: new Date().toISOString(),
      }, error.status as any)
    }
    return serverError(c, error)
  }
})

export { productsApp as productsRoutesV3 }
