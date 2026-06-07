/** services/trigger-deploy.ts — 触发 E-Catalog 构建 + Cloudflare Pages 部署 */

import { exec } from 'child_process'
import { rmSync, existsSync } from 'fs'
import path from 'path'

const CF_API = 'https://api.cloudflare.com/client/v4'

const deployTriggers = new Map<string, number>()

interface DeployResult {
  deployId: string
  status: string
}

/**
 * 触发 E-Catalog 构建 + Cloudflare Pages 部署 (异步后台执行)
 *
 * 流程: 1) Node.js rmSync 清缓存 → 2) cmd /c 构建+部署
 */
export async function triggerDeploy(): Promise<DeployResult> {
  const ecatalogPath = process.env.ECATALOG_PATH
    || path.resolve(process.cwd(), '..', '..', '..', '..', 'E-Catalog')
  const projectName = process.env.CF_PAGES_PROJECT_NAME || 'catalog'
  const branch = process.env.CF_PAGES_BRANCH || 'catalog'
  const deployId = Date.now().toString(36)

  deployTriggers.set(deployId, Date.now())

  // 1) Node.js 清理缓存 (更可靠)
  const nextDir = path.join(ecatalogPath, '.next')
  const outDir = path.join(ecatalogPath, 'out')
  for (const dir of [nextDir, outDir]) {
    if (existsSync(dir)) {
      try { rmSync(dir, { recursive: true, force: true, maxRetries: 3 }); console.log('[trigger-deploy] 已清理:', path.basename(dir)) }
      catch (e: any) { console.error('[trigger-deploy] 清理失败:', path.basename(dir), e.message) }
    }
  }

  // 2) 构建 + 部署
  const safePath = ecatalogPath.replace(/&/g, '^&')
  const cmd = `cmd /c "cd /d ${safePath} && set NODE_ENV=production && npm run build && npx wrangler pages deploy out --project-name ${projectName} --branch ${branch} --commit-dirty=true"`

  console.log('[trigger-deploy] 开始 E-Catalog 部署...')

  exec(cmd, { timeout: 300000, windowsHide: true }, (error, stdout, stderr) => {
    if (error) {
      console.error('[trigger-deploy] 部署失败 (exit ' + error.code + '):', stderr?.slice(-300) || error.message)
    } else {
      const urlMatch = (stdout + (stderr || '')).match(/https:\/\/([a-f0-9]+)\./)
      const deployUrl = urlMatch ? urlMatch[0].replace(/[\r\n]/g, '').trim() : null
      console.log('[trigger-deploy] 部署完成:', deployUrl || 'success')
    }
  })

  return { deployId, status: 'building' }
}

/**
 * 查询 Cloudflare Pages 最新部署状态
 */
export async function getDeployStatus(deployId: string): Promise<{
  status: string
  url: string | null
  latestStage: string | null
}> {
  const token = process.env.CLOUDFLARE_API_TOKEN
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const projectName = process.env.CF_PAGES_PROJECT_NAME || 'catalog'

  if (!token || !accountId) {
    return { status: 'pending', url: null, latestStage: 'building (no token)' }
  }

  const projectRes = await fetch(
    `${CF_API}/accounts/${accountId}/pages/projects/${projectName}`,
    { headers: { 'Authorization': `Bearer ${token}` } },
  )

  if (!projectRes.ok) {
    return { status: 'pending', url: null, latestStage: `project query failed: HTTP ${projectRes.status}` }
  }

  const projectJson = await projectRes.json() as any
  const latest = projectJson?.result?.latest_deployment

  if (!latest) {
    return { status: 'pending', url: null, latestStage: 'no deployment yet' }
  }

  const triggerTime = deployTriggers.get(deployId) ?? 0
  const deployCreatedAt = new Date(latest.created_on).getTime()

  if (deployCreatedAt > triggerTime) {
    const stageStatus = latest.latest_stage?.status || 'unknown'
    if (stageStatus === 'success') {
      deployTriggers.delete(deployId)
      return { status: 'success', url: latest.url || null, latestStage: latest.latest_stage?.name || null }
    }
    if (stageStatus === 'failure') {
      deployTriggers.delete(deployId)
      return { status: 'failure', url: null, latestStage: latest.latest_stage?.name || null }
    }
    return { status: 'building', url: latest.url || null, latestStage: latest.latest_stage?.name || null }
  }

  return { status: 'building', url: null, latestStage: 'waiting for deploy' }
}
