/** services/trigger-deploy.ts — 触发 Cloudflare Pages 项目构建部署 */

const CF_API = 'https://api.cloudflare.com/client/v4'

interface DeployResult {
  deployId: string
  status: string
}

/**
 * 触发 Cloudflare Pages 重新部署
 *
 * 环境变量:
 *   CLOUDFLARE_API_TOKEN  — Cloudflare API Token
 *   CLOUDFLARE_ACCOUNT_ID  — Cloudflare Account ID
 *   CF_PAGES_PROJECT_NAME  — Pages 项目名称 (默认: catalog)
 *   CF_PAGES_BRANCH        — 部署分支 (默认: catalog)
 */
export async function triggerDeploy(): Promise<DeployResult> {
  const token = process.env.CLOUDFLARE_API_TOKEN
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const projectName = process.env.CF_PAGES_PROJECT_NAME || 'catalog'
  const branch = process.env.CF_PAGES_BRANCH || 'catalog'

  if (!token || !accountId) {
    throw new Error('CLOUDFLARE_API_TOKEN 或 CLOUDFLARE_ACCOUNT_ID 未配置')
  }

  const url = `${CF_API}/accounts/${accountId}/pages/projects/${projectName}/deployments`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ branch }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message = (body as any)?.errors?.map((e: any) => e.message).join(', ') || `HTTP ${res.status}`
    throw new Error(`Cloudflare API 调用失败: ${message}`)
  }

  const json = await res.json() as any
  const deployId = json?.result?.id

  if (!deployId) {
    throw new Error('Cloudflare API 未返回 deployment id')
  }

  return { deployId, status: json.result.status || 'pending' }
}

/**
 * 查询 Cloudflare Pages 部署状态
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
    throw new Error('CLOUDFLARE_API_TOKEN 或 CLOUDFLARE_ACCOUNT_ID 未配置')
  }

  const url = `${CF_API}/accounts/${accountId}/pages/projects/${projectName}/deployments/${deployId}`

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  if (!res.ok) {
    throw new Error(`查询部署状态失败: HTTP ${res.status}`)
  }

  const json = await res.json() as any
  const result = json?.result

  return {
    status: result?.latest_stage?.status || 'unknown',
    url: result?.url || null,
    latestStage: result?.latest_stage?.name || null,
  }
}
