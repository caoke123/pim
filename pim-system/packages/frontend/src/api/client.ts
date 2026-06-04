/** api/client.ts — 前端 API 客户端 */

const API_BASE = import.meta.env.VITE_API_BASE_URL + '/api/v1'

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

  /** 图册列表 */
  getCatalogs(params?: Record<string, string | number>) {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString() : ''
    return request<import('./types').ApiEnvelope<import('./types').PaginatedData<import('./types').CatalogListItem>>>(`/catalogs${qs}`)
  },

  /** 客户列表 */
  getCustomers(params?: Record<string, string | number>) {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString() : ''
    return request<import('./types').ApiEnvelope<import('./types').PaginatedData<import('./types').CustomerListItem>>>(`/distributions/customers${qs}`)
  },

  /** 创建客户 */
  createCustomer(body: { name: string; contactPerson?: string; phone?: string; wechat?: string; notes?: string }) {
    return request<import('./types').ApiEnvelope<{ id: string; name: string; contactPerson: string | null; phone: string | null; wechat: string | null; notes: string | null; status: string; operator: string | null; createdAt: string; updatedAt: string }>>('/distributions/customers', { method: 'POST', body: JSON.stringify(body) })
  },

  /** 更新客户 */
  updateCustomer(id: string, body: { name?: string; contactPerson?: string; phone?: string; wechat?: string; notes?: string }) {
    return request<import('./types').ApiEnvelope<{ id: string }>>(`/distributions/customers/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  },

  /** 删除客户 */
  deleteCustomer(id: string) {
    return request<import('./types').ApiEnvelope<null>>(`/distributions/customers/${id}`, { method: 'DELETE' })
  },

  /** 分销列表 */
  getDistributions(params?: Record<string, string | number>) {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString() : ''
    return request<import('./types').ApiEnvelope<import('./types').PaginatedData<import('./types').DistributionListItem>>>(`/distributions${qs}`)
  },

  /** 分销详情 */
  getDistributionDetail(id: string) {
    return request<import('./types').ApiEnvelope<import('./types').DistributionDetail>>(`/distributions/${id}`)
  },

  /** 创建分销 */
  createDistribution(body: { customerId: string; catalogId: string; agreement?: string; showCustomerName?: boolean }) {
    return request<import('./types').ApiEnvelope<{ id: string; publicUrl: string | null }>>('/distributions', { method: 'POST', body: JSON.stringify(body) })
  },

  /** 更新分销 */
  updateDistribution(id: string, body: { agreement?: string; status?: 'active' | 'inactive'; showCustomerName?: boolean }) {
    return request<import('./types').ApiEnvelope<{ id: string }>>(`/distributions/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  },

  /** 删除分销 */
  deleteDistribution(id: string) {
    return request<import('./types').ApiEnvelope<null>>(`/distributions/${id}`, { method: 'DELETE' })
  },

  /** 发布分销 */
  publishDistribution(id: string) {
    return request<import('./types').ApiEnvelope<{ publicUrl: string | null }>>(`/distributions/${id}/publish`, { method: 'POST' })
  },

  /** 批量更新分销价格 */
  upsertDistributionPrices(id: string, items: { skuId: string; customerPrice: number | null }[]) {
    return request<import('./types').ApiEnvelope<{ updated: number }>>(`/distributions/${id}/prices`, { method: 'POST', body: JSON.stringify({ items }) })
  },

  /** 分享页 — 公开 API */
  getShareDistribution(id: string) {
    return request<import('./types').ApiEnvelope<import('./types').ShareDistributionResponse>>(import.meta.env.VITE_API_BASE_URL + `/api/share/distributions/${id}`)
  },
}
