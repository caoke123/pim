/** shared/hono.ts — 带类型变量的 Hono 实例 */

import { Hono } from 'hono'

/** 应用全局 Context Variables */
export interface AppVariables {
  requestId: string
}

/** 带类型变量的 Hono App */
export type App = Hono<{ Variables: AppVariables }>

/** 创建带类型变量的 Hono App */
export function createHonoApp(): App {
  return new Hono<{ Variables: AppVariables }>()
}
