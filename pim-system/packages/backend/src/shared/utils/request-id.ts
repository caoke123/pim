/** shared/utils/request-id.ts — RequestId 中间件，为每个请求生成唯一 ID */

import type { Context, Next } from 'hono'

export async function requestIdMiddleware(c: Context, next: Next) {
  const id = crypto.randomUUID()
  c.set('requestId', id)
  c.res.headers.set('X-Request-Id', id)
  await next()
}
