/** modules/deploy/deploy.routes.ts — 部署状态查询 API */

import { Hono } from 'hono'
import { getDeployStatus } from '../../services/trigger-deploy'
import type { AppVariables } from '../../shared/hono'

const deployApp = new Hono<{ Variables: AppVariables }>()

/**
 * GET /api/v1/deploy/status/:deployId — 查询部署进度
 *
 * 返回:
 *   { code: 0, data: { status: 'success'|'failure'|'pending'|'unknown', url, latestStage } }
 */
deployApp.get('/status/:deployId', async (c) => {
  try {
    const deployId = c.req.param('deployId')
    if (!deployId) {
      return c.json({ code: 1, message: 'deployId 不能为空' }, 400)
    }

    const status = await getDeployStatus(deployId)
    return c.json({ code: 0, message: 'ok', data: status })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return c.json({ code: 1, message }, 500)
  }
})

export { deployApp as deployRoutes }
