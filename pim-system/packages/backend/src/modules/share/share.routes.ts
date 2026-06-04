/** modules/share/share.routes.ts — 分享公开 API 路由 */

import { Hono } from 'hono'
import { z } from 'zod'
import { shareService } from './share.service'
import { NotFoundError, BusinessError, ErrorCode } from '../../shared/utils/errors'

const shareRoutes = new Hono()

const paramsSchema = z.object({
  id: z.string().uuid('Invalid distribution id'),
})

shareRoutes.get('/distributions/:id', async (c) => {
  const rawParams = { id: c.req.param('id') }
  const parsed = paramsSchema.safeParse(rawParams)
  if (!parsed.success) {
    throw new BusinessError(ErrorCode.VALIDATION, parsed.error.issues[0]?.message ?? 'Invalid distribution id')
  }
  const data = await shareService.getShareDistribution(parsed.data.id)
  if (!data) throw new NotFoundError(ErrorCode.NOT_FOUND, '分销分享不存在或未发布')
  return c.json({ code: 0, message: 'ok', data })
})

export { shareRoutes }
