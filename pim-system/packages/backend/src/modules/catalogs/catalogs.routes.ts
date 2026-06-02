/** modules/catalogs/catalogs.routes.ts — 图册 API 路由 */

import { Hono } from 'hono'
import { catalogsService } from './catalogs.service'
import { AppError, ValidationError, NotFoundError, ErrorCode } from '../../shared/utils/errors'
import { createRequestLogger } from '../../shared/utils/logger'
import { ok, okPaginated, fail, serverError } from '../../shared/utils/response'
import { parsePagination } from '../../shared/utils/pagination'
import type { AppVariables } from '../../shared/hono'

const catalogsApp = new Hono<{ Variables: AppVariables }>()

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/catalogs — 获取图册列表
// ═══════════════════════════════════════════════════════════════════════════════

catalogsApp.get('/', async (c) => {
  const requestId = c.get('requestId')
  const log = createRequestLogger(requestId)

  try {
    const { page, pageSize } = parsePagination({
      page: c.req.query('page'),
      pageSize: c.req.query('pageSize'),
    })

    log.info({ page, pageSize }, '图册列表查询')

    const result = await catalogsService.getList(page, pageSize)

    return okPaginated(c, result.items, result.total, result.page, result.pageSize)
  } catch (error) {
    return serverError(c, error)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/catalogs/stats — 图册统计
// ═══════════════════════════════════════════════════════════════════════════════

catalogsApp.get('/stats', async (c) => {
  const requestId = c.get('requestId')
  const log = createRequestLogger(requestId)

  try {
    const stats = await catalogsService.getStats()
    return ok(c, stats)
  } catch (error) {
    return serverError(c, error)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/catalogs/:id — 获取单个图册
// ═══════════════════════════════════════════════════════════════════════════════

catalogsApp.get('/:id', async (c) => {
  const requestId = c.get('requestId')
  const log = createRequestLogger(requestId)

  try {
    const id = c.req.param('id')

    if (!id || id.length < 10) {
      return fail(c, '无效的图册 ID')
    }

    log.info({ catalogId: id }, '图册详情查询')

    const detail = await catalogsService.getById(id)

    if (!detail) {
      return fail(c, '图册不存在', 404)
    }

    return ok(c, detail)
  } catch (error) {
    return serverError(c, error)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/catalogs — 创建图册
// ═══════════════════════════════════════════════════════════════════════════════

catalogsApp.post('/', async (c) => {
  const requestId = c.get('requestId')
  const log = createRequestLogger(requestId)

  try {
    const body = await c.req.json()

    if (!body.name || typeof body.name !== 'string') {
      return fail(c, '图册名称 (name) 不能为空')
    }

    if (body.productIds !== undefined && !Array.isArray(body.productIds)) {
      return fail(c, 'productIds 必须是字符串数组')
    }

    log.info({ name: body.name, productCount: body.productIds?.length || 0 }, '创建图册')

    const catalog = await catalogsService.create({
      name: body.name,
      description: body.description,
      productIds: body.productIds || [],
    })

    return ok(c, catalog, '图册创建成功', 201)
  } catch (error) {
    if (error instanceof AppError) {
      return fail(c, error.message, error.status as any)
    }
    return serverError(c, error)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/v1/catalogs/:id — 更新图册
// ═══════════════════════════════════════════════════════════════════════════════

catalogsApp.patch('/:id', async (c) => {
  const requestId = c.get('requestId')
  const log = createRequestLogger(requestId)

  try {
    const id = c.req.param('id')

    if (!id || id.length < 10) {
      return fail(c, '无效的图册 ID')
    }

    const body = await c.req.json()

    const dto: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return fail(c, 'name 不能为空字符串')
      }
      dto.name = body.name
    }

    if (body.productIds !== undefined) {
      if (!Array.isArray(body.productIds)) {
        return fail(c, 'productIds 必须是字符串数组')
      }
      dto.productIds = body.productIds
    }

    if (body.coverImageUrl !== undefined) {
      dto.coverImageUrl = body.coverImageUrl
    }

    if (body.description !== undefined) {
      if (body.description !== null && typeof body.description !== 'string') {
        return fail(c, 'description 必须是字符串或 null')
      }
      dto.description = body.description
    }

    if (Object.keys(dto).length === 0) {
      return fail(c, '至少需要提供一个要更新的字段')
    }

    log.info({ catalogId: id, updates: dto }, '更新图册')

    const updated = await catalogsService.update(id, dto as any)

    if (!updated) {
      return fail(c, '图册不存在', 404)
    }

    return ok(c, updated, '图册更新成功')
  } catch (error) {
    if (error instanceof AppError) {
      return fail(c, error.message, error.status as any)
    }
    return serverError(c, error)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/v1/catalogs/:id — 删除图册 (软删除)
// ═══════════════════════════════════════════════════════════════════════════════

catalogsApp.delete('/:id', async (c) => {
  const requestId = c.get('requestId')
  const log = createRequestLogger(requestId)

  try {
    const id = c.req.param('id')

    if (!id || id.length < 10) {
      return fail(c, '无效的图册 ID')
    }

    log.info({ catalogId: id }, '删除图册')

    const deleted = await catalogsService.softDelete(id)

    if (!deleted) {
      return fail(c, '图册不存在', 404)
    }

    return ok(c, { id, status: 'deleted' }, '图册已删除')
  } catch (error) {
    return serverError(c, error)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/catalogs/:id/publish — 发布图册到 R2
// ═══════════════════════════════════════════════════════════════════════════════

catalogsApp.post('/:id/publish', async (c) => {
  const requestId = c.get('requestId')
  const log = createRequestLogger(requestId)

  try {
    const id = c.req.param('id')

    if (!id || id.length < 10) {
      return fail(c, '无效的图册 ID')
    }

    log.info({ catalogId: id }, '发布图册')

    const result = await catalogsService.publishCatalog(id)

    return ok(c, result, '图册发布成功')
  } catch (error) {
    if (error instanceof AppError) {
      return fail(c, error.message, error.status as any)
    }
    return serverError(c, error)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/catalogs/:id/view — 跟踪图册访问
// ═══════════════════════════════════════════════════════════════════════════════

catalogsApp.post('/:id/view', async (c) => {
  try {
    const id = c.req.param('id')
    if (!id || id.length < 10) {
      return fail(c, '无效的图册 ID')
    }
    const result = await catalogsService.trackView(id)
    if (!result) {
      return fail(c, '图册不存在', 404)
    }
    return ok(c, result)
  } catch (error) {
    if (error instanceof AppError) {
      return fail(c, error.message, error.status as any)
    }
    return serverError(c, error)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/catalogs/:id/cover — 上传图册封面 (dataURL 格式)
// ═══════════════════════════════════════════════════════════════════════════════

catalogsApp.post('/:id/cover', async (c) => {
  try {
    const id = c.req.param('id')
    if (!id || id.length < 10) {
      return fail(c, '无效的图册 ID')
    }
    const body = await c.req.json<{ dataUrl?: string }>()
    if (!body.dataUrl) {
      return fail(c, 'dataUrl 不能为空')
    }
    const result = await catalogsService.uploadCover(id, body.dataUrl)
    if (!result) {
      return fail(c, '图册不存在', 404)
    }
    return ok(c, result, '封面上传成功')
  } catch (error) {
    if (error instanceof AppError) {
      return fail(c, error.message, error.status as any)
    }
    return serverError(c, error)
  }
})

export { catalogsApp as catalogsRoutes }
