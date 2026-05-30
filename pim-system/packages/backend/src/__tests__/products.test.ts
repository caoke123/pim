/** __tests__/products.test.ts — 产品 API 单元测试 (校验层) */

import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { requestIdMiddleware } from '../shared/utils'
import { globalErrorHandler } from '../shared/middleware'
import type { AppVariables } from '../shared/hono'

// ── 测试 Zod Schema 校验 (不依赖 DB) ──

import {
  productListQuerySchema,
  productIdParamSchema,
  productBasicUpdateSchema,
  skusUpdateSchema,
} from '../modules/products/products.schema'

describe('Zod Schema 校验', () => {
  describe('productListQuerySchema', () => {
    it('空参数应使用默认值', () => {
      const result = productListQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.pageSize).toBe(20)
        expect(result.data.sortBy).toBe('createdAt')
        expect(result.data.order).toBe('desc')
      }
    })

    it('有效参数应通过', () => {
      const result = productListQuerySchema.safeParse({
        page: '2',
        pageSize: '10',
        keyword: '小熊',
        status: 'ready',
        sortBy: 'title',
        order: 'asc',
      })
      expect(result.success).toBe(true)
    })

    it('无效 status 应失败', () => {
      const result = productListQuerySchema.safeParse({ status: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('pageSize 超过 100 应失败', () => {
      const result = productListQuerySchema.safeParse({ pageSize: '200' })
      expect(result.success).toBe(false)
    })
  })

  describe('productIdParamSchema', () => {
    it('有效 UUID 应通过', () => {
      const result = productIdParamSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.success).toBe(true)
    })

    it('无效字符串应失败', () => {
      const result = productIdParamSchema.safeParse({ id: 'not-a-uuid' })
      expect(result.success).toBe(false)
    })
  })

  describe('productBasicUpdateSchema', () => {
    it('空对象应失败 (至少一个字段)', () => {
      const result = productBasicUpdateSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('有效 status 应通过', () => {
      for (const s of ['pending', 'ready', 'active', 'archived']) {
        const result = productBasicUpdateSchema.safeParse({ status: s })
        expect(result.success).toBe(true)
      }
    })

    it('无效 status 应失败', () => {
      const result = productBasicUpdateSchema.safeParse({ status: 'deleted' })
      expect(result.success).toBe(false)
    })

    it('有效 title 应通过', () => {
      const result = productBasicUpdateSchema.safeParse({ title: '新产品标题' })
      expect(result.success).toBe(true)
    })

    it('空 title 应失败', () => {
      const result = productBasicUpdateSchema.safeParse({ title: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('skusUpdateSchema', () => {
    it('空数组应失败', () => {
      const result = skusUpdateSchema.safeParse({ skus: [] })
      expect(result.success).toBe(false)
    })

    it('有效 SKU 应通过', () => {
      const result = skusUpdateSchema.safeParse({
        skus: [{ skuId: '550e8400-e29b-41d4-a716-446655440000', stock: 10 }],
      })
      expect(result.success).toBe(true)
    })

    it('无效 skuId 应失败', () => {
      const result = skusUpdateSchema.safeParse({
        skus: [{ skuId: 'not-uuid', stock: 10 }],
      })
      expect(result.success).toBe(false)
    })

    it('负数价格应失败', () => {
      const result = skusUpdateSchema.safeParse({
        skus: [{ skuId: '550e8400-e29b-41d4-a716-446655440000', sellingPrice: -1 }],
      })
      expect(result.success).toBe(false)
    })

    it('51 个 SKU 应失败', () => {
      const skus = Array.from({ length: 51 }, (_, i) => ({
        skuId: `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
        stock: i,
      }))
      const result = skusUpdateSchema.safeParse({ skus })
      expect(result.success).toBe(false)
    })
  })
})

// ── 测试 API 路由结构 (不依赖 DB, 仅验证 400 校验) ──

function createTestApp() {
  const app = new Hono<{ Variables: AppVariables }>()
  app.use('/*', requestIdMiddleware)
  app.onError(globalErrorHandler)
  app.get('/api/v1/health', (c) => {
    return c.json({ status: 'ok', requestId: c.get('requestId'), timestamp: new Date().toISOString() })
  })
  return app
}

const app = createTestApp()

describe('API 中间件 & 基础设施', () => {
  describe('requestId 中间件', () => {
    it('每个请求应生成唯一 requestId', async () => {
      const ids = new Set<string>()
      for (let i = 0; i < 5; i++) {
        const req = new Request('http://localhost/api/v1/health')
        const res = await app.fetch(req)
        const json = await res.json()
        ids.add(json.requestId)
      }
      expect(ids.size).toBe(5) // 每个请求不同 ID
    })
  })

  describe('全局错误处理', () => {
    it('未注册路由应返回 404', async () => {
      const req = new Request('http://localhost/api/v1/nonexistent')
      const res = await app.fetch(req)
      expect(res.status).toBe(404)
    })

    it('健康检查应返回 200', async () => {
      const req = new Request('http://localhost/api/v1/health')
      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.status).toBe('ok')
      expect(json).toHaveProperty('requestId')
      expect(json).toHaveProperty('timestamp')
    })
  })
})

// ── 测试错误类 ──

import {
  AppError,
  BusinessError,
  ValidationError,
  NotFoundError,
  ErrorCode,
} from '../shared/utils/errors'

describe('错误类体系', () => {
  it('AppError 应有正确的属性', () => {
    const err = new AppError(ErrorCode.DB_ERROR, '数据库错误', 500, { detail: 'test' })
    expect(err.code).toBe('DB_ERROR')
    expect(err.message).toBe('数据库错误')
    expect(err.status).toBe(500)
    expect(err.details).toEqual({ detail: 'test' })
    expect(err.toJSON()).toEqual({
      code: 'DB_ERROR',
      message: '数据库错误',
      details: { detail: 'test' },
    })
  })

  it('ValidationError 状态码应为 400', () => {
    const err = new ValidationError('校验失败')
    expect(err.status).toBe(400)
    expect(err.code).toBe('VALIDATION_ERROR')
  })

  it('NotFoundError 状态码应为 404', () => {
    const err = new NotFoundError(ErrorCode.PRODUCT_NOT_FOUND, '产品不存在')
    expect(err.status).toBe(404)
    expect(err.code).toBe('PRODUCT_NOT_FOUND')
  })

  it('BusinessError 状态码应为 400', () => {
    const err = new BusinessError(ErrorCode.DUPLICATE_SPU_CODE, 'SPU编码重复')
    expect(err.status).toBe(400)
  })

  it('错误 instanceof 继承链应正确', () => {
    const ve = new ValidationError('test')
    const ne = new NotFoundError(ErrorCode.PRODUCT_NOT_FOUND, 'test')
    const be = new BusinessError(ErrorCode.INVALID_STATUS, 'test')

    expect(ve).toBeInstanceOf(AppError)
    expect(ne).toBeInstanceOf(AppError)
    expect(be).toBeInstanceOf(AppError)
    expect(ve).toBeInstanceOf(Error)
  })
})

// ── 测试分页工具 ──

import { paginate, parsePagination } from '../shared/utils/pagination'

describe('分页工具', () => {
  it('paginate 应返回统一结构', () => {
    const result = paginate([1, 2, 3], 100, 1, 20)
    expect(result.data).toEqual([1, 2, 3])
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 100,
      totalPages: 5,
    })
  })

  it('totalPages 应向上取整', () => {
    const result = paginate([], 101, 1, 20)
    expect(result.pagination.totalPages).toBe(6)
  })

  it('parsePagination 应处理非法值', () => {
    const r1 = parsePagination({ page: -1, pageSize: 0 })
    expect(r1.page).toBe(1)
    expect(r1.pageSize).toBe(20) // 0 视为未提供, 使用默认 20

    const r2 = parsePagination({ page: 5, pageSize: 200 })
    expect(r2.page).toBe(5)
    expect(r2.pageSize).toBe(100) // 超过 100 则截断

    const r3 = parsePagination({ page: 'abc', pageSize: 'xyz' })
    expect(r3.page).toBe(1)
    expect(r3.pageSize).toBe(20)
  })
})

// ── 测试 problemFlags 规则 ──

import { evaluateProblemFlags, getActiveProblems, getProblemsByPriority } from '../rules/problemFlags'

describe('problemFlags 规则', () => {
  it('正常产品应无标记', () => {
    const flags = evaluateProblemFlags({
      mainImageUrl: 'http://example.com/img.jpg',
      description: '产品描述',
      category: '手链',
      spuCode: 'SPU-001',
      skuPrices: [100, 200],
      skuCount: 2,
      hasSkuMissingImage: false,
    })

    // 全部应为 false
    Object.values(flags).forEach((v) => expect(v).toBe(false))
  })

  it('缺少主图应标记 missingMainImage', () => {
    const flags = evaluateProblemFlags({
      mainImageUrl: null,
      description: '描述',
      category: '类目',
      spuCode: 'SPU-001',
      skuPrices: [100],
      skuCount: 1,
      hasSkuMissingImage: false,
    })
    expect(flags.missingMainImage).toBe(true)
  })

  it('所有价格为空应标记 missingPrice', () => {
    const flags = evaluateProblemFlags({
      mainImageUrl: 'url',
      description: '描述',
      category: '类目',
      spuCode: 'SPU-001',
      skuPrices: [null, null],
      skuCount: 2,
      hasSkuMissingImage: false,
    })
    expect(flags.missingPrice).toBe(true)
  })

  it('空描述应标记 missingDescription', () => {
    const flags = evaluateProblemFlags({
      mainImageUrl: 'url',
      description: '',
      category: '类目',
      spuCode: 'SPU-001',
      skuPrices: [100],
      skuCount: 1,
      hasSkuMissingImage: false,
    })
    expect(flags.missingDescription).toBe(true)
  })

  it('SPU 为空应标记 hasNullSpuCode', () => {
    const flags = evaluateProblemFlags({
      mainImageUrl: 'url',
      description: '描述',
      category: '类目',
      spuCode: null,
      skuPrices: [100],
      skuCount: 1,
      hasSkuMissingImage: false,
    })
    expect(flags.hasNullSpuCode).toBe(true)
  })

  it('getActiveProblems 应返回活动标记', () => {
    const flags = {
      missingMainImage: true,
      missingPrice: false,
      missingDescription: true,
      missingCategory: false,
      missingSkuImage: false,
      hasNullSpuCode: false,
    }
    const active = getActiveProblems(flags)
    expect(active).toHaveLength(2)
  })

  it('getProblemsByPriority 应按优先级排序', () => {
    const flags = {
      missingMainImage: true,   // high
      missingPrice: false,
      missingDescription: true, // medium
      missingCategory: true,    // medium
      missingSkuImage: true,    // low
      hasNullSpuCode: false,
    }
    const sorted = getProblemsByPriority(flags)
    expect(sorted[0].priority).toBe('high')
    expect(sorted[sorted.length - 1].priority).toBe('low')
  })
})
