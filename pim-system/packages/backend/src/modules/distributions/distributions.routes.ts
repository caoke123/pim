/** modules/distributions/distributions.routes.ts — 分销管理路由 */

import { Hono } from 'hono'
import { z } from 'zod'
import { distributionsService } from './distributions.service'
import { NotFoundError, BusinessError, ErrorCode } from '../../shared/utils/errors'

const distributionsRoutes = new Hono()

const createSchema = z.object({
  customerId: z.string().uuid('客户 ID 不合法'),
  catalogId: z.string().uuid('图册 ID 不合法'),
  agreement: z.string().max(20000).optional(),
  showCustomerName: z.boolean().optional(),
})

const updateSchema = z.object({
  agreement: z.string().max(20000).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  showCustomerName: z.boolean().optional(),
}).strict()

const upsertPricesSchema = z.object({
  items: z
    .array(
      z.object({
        skuId: z.string().uuid(),
        customerPrice: z.number().nullable(),
      })
    )
    .min(1),
})

distributionsRoutes.get('/', async (c) => {
  const page = Number(c.req.query('page') ?? 1) || 1
  const pageSize = Math.min(Number(c.req.query('pageSize') ?? 20) || 20, 100)
  const data = await distributionsService.getList(page, pageSize)
  return c.json({ code: 0, message: 'ok', data })
})

distributionsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const data = await distributionsService.getById(id)
  if (!data) throw new NotFoundError(ErrorCode.NOT_FOUND, '分销记录不存在')
  return c.json({ code: 0, message: 'ok', data })
})

distributionsRoutes.post('/', async (c) => {
  const body = await c.req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    throw new BusinessError(ErrorCode.VALIDATION, parsed.error.issues[0]?.message ?? '参数错误')
  }
  const data = await distributionsService.create(parsed.data)
  return c.json({ code: 0, message: 'ok', data }, 201)
})

distributionsRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    throw new BusinessError(ErrorCode.VALIDATION, parsed.error.issues[0]?.message ?? '参数错误')
  }
  const row = await distributionsService.update(id, parsed.data)
  if (!row) throw new NotFoundError(ErrorCode.NOT_FOUND, '分销记录不存在')
  return c.json({ code: 0, message: 'ok', data: row })
})

distributionsRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const ok = await distributionsService.softDelete(id)
  if (!ok) throw new NotFoundError(ErrorCode.NOT_FOUND, '分销记录不存在')
  return c.json({ code: 0, message: 'ok' })
})

distributionsRoutes.post('/:id/publish', async (c) => {
  const id = c.req.param('id')
  const data = await distributionsService.publishDistribution(id)
  return c.json({ code: 0, message: 'ok', data })
})

distributionsRoutes.post('/:id/prices', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const parsed = upsertPricesSchema.safeParse(body)
  if (!parsed.success) {
    throw new BusinessError(ErrorCode.VALIDATION, parsed.error.issues[0]?.message ?? '参数错误')
  }
  const count = await distributionsService.upsertPrices(id, parsed.data.items)
  return c.json({ code: 0, message: 'ok', data: { updated: count } })
})

export { distributionsRoutes }
