/** modules/distributions/customers.routes.ts — 客户管理路由 */

import { Hono } from 'hono'
import { z } from 'zod'
import { customersService } from './customers.service'
import { NotFoundError, BusinessError, ErrorCode } from '../../shared/utils/errors'

const customersRoutes = new Hono()

const createSchema = z.object({
  name: z.string().min(1, '客户名称不能为空').max(255),
  contactPerson: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  wechat: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  contactPerson: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  wechat: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
})

customersRoutes.get('/', async (c) => {
  const page = Number(c.req.query('page') ?? 1) || 1
  const pageSize = Math.min(Number(c.req.query('pageSize') ?? 20) || 20, 100)
  const data = await customersService.getList(page, pageSize)
  return c.json({ code: 0, message: 'ok', data })
})

customersRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const row = await customersService.getById(id)
  if (!row) throw new NotFoundError(ErrorCode.NOT_FOUND, '客户不存在')
  return c.json({ code: 0, message: 'ok', data: row })
})

customersRoutes.post('/', async (c) => {
  const body = await c.req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    throw new BusinessError(ErrorCode.VALIDATION, parsed.error.issues[0]?.message ?? '参数错误')
  }
  const row = await customersService.create(parsed.data)
  return c.json({ code: 0, message: 'ok', data: row }, 201)
})

customersRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    throw new BusinessError(ErrorCode.VALIDATION, parsed.error.issues[0]?.message ?? '参数错误')
  }
  const row = await customersService.update(id, parsed.data)
  if (!row) throw new NotFoundError(ErrorCode.NOT_FOUND, '客户不存在')
  return c.json({ code: 0, message: 'ok', data: row })
})

customersRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const ok = await customersService.softDelete(id)
  if (!ok) throw new NotFoundError(ErrorCode.NOT_FOUND, '客户不存在')
  return c.json({ code: 0, message: 'ok' })
})

export { customersRoutes }
