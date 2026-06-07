/** packages/shared/types/product.ts — 共享类型定义 */

// ── 通用响应格式 ──────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  error?: string
  meta?: Record<string, unknown>
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// ── 平台 / 状态枚举 ──────────────────────────────────────────────────────

export type Platform = 'shopee' | 'temu' | 'miaoshou'
export type ProductStatus = 'pending' | 'active' | 'archived'
export type SyncTrigger = 'auto' | 'manual'
export type SyncStatus = 'running' | 'done' | 'failed'

// ── 导出记录 ──────────────────────────────────────────────────────────────

export interface ExportRecord {
  id: string
  platform: Platform
  productIds: string[]
  fileName: string | null
  fileUrl: string | null
  exportedBy: string | null
  createdAt: string
}

// ── 分销商 (旧表，独立体系) ───────────────────────────────────────────────

export interface DistributorRecord {
  id: string
  name: string
  contact: string | null
  apiToken: string
  allowedCategories: string[] | null
  priceType: string
  priceMarkup: number
  isActive: boolean
  createdAt: string
}
