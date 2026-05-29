/** packages/backend/src/middleware/distributor-auth.ts — 分销商 Token 鉴权中间件 */

import type { Context, Next } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { distributors } from '../db/schema'

export async function distributorAuth(c: Context, next: Next) {
  const token = c.req.header('X-Distributor-Token')

  if (!token) {
    return c.json({ data: null, error: 'Invalid distributor token' }, 401)
  }

  const [distributor] = await db
    .select()
    .from(distributors)
    .where(eq(distributors.apiToken, token))
    .limit(1)

  if (!distributor || !distributor.isActive) {
    return c.json({ data: null, error: 'Invalid distributor token' }, 401)
  }

  // 注入 context 供下游路由使用
  c.set('distributor', distributor)
  await next()
}
