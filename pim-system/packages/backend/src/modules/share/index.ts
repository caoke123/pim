/** modules/share/index.ts — 分享模块路由挂载 */

import { Hono } from 'hono'
import { shareRoutes } from './share.routes'

const shareModule = new Hono()

shareModule.route('/', shareRoutes)

export { shareModule }
