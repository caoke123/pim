/** modules/distributions/index.ts — 路由挂载 */

import { Hono } from 'hono'
import { customersRoutes } from './customers.routes'
import { distributionsRoutes } from './distributions.routes'

const distributionsModule = new Hono()

distributionsModule.route('/customers', customersRoutes)
distributionsModule.route('/', distributionsRoutes)

export { distributionsModule }
