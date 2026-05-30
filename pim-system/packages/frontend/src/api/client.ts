/** api/client.ts — 前端 API 客户端 */

const API_BASE = 'http://localhost:8000/api/v1'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message || body?.message || `HTTP ${res.status}`)
  }

  return res.json()
}

export const api = {
  /** 产品列表 */
  getProducts(params?: Record<string, string | number>) {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString() : ''
    return request<import('./types').ApiResponse<import('./types').PaginatedData<import('./types').ProductListItem>>>(`/products${qs}`)
  },

  /** 产品详情 */
  getProductDetail(id: string) {
    return request<import('./types').ApiResponse<import('./types').ProductDetail>>(`/products/${id}`)
  },

  /** 统计概览 */
  getStatsOverview() {
    return request<import('./types').ApiResponse<import('./types').StatsOverview>>('/stats/overview')
  },
}
