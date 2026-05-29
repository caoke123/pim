/** packages/shared/types/product.ts — 产品核心类型定义，前后端共用 */

// ── R2 product.json 原始结构（来自分拣系统）──────────────────────────────

export interface ProductJsonR2Images {
  main: { fileName: string; url: string }[]
  sku: { fileName: string; url: string }[]
  detail: { fileName: string; url: string }[]
}

export interface ProductJsonR2 {
  syncedAt: string
  basePath: string
  baseUrl: string
  images: ProductJsonR2Images
}

export interface OuterPackaging {
  length: number
  width: number
  height: number
  weight: number
  presetName: string
}

export interface ProductJsonSku {
  skuCode: string
  skuName: string
  imageUrl: string
  image: string
  size: string
  weight: number
  costPrice: number
  sellingPrice: number
}

export interface ProductJson {
  productNo: string
  title: string
  shortTitle: string
  category: string
  description: string
  folderName: string
  toolVersion: string
  outerPackaging: OuterPackaging
  skus: ProductJsonSku[]
  r2: ProductJsonR2
}

// ── 数据库记录类型（对应各数据库表，字段名与数据库 snake_case 一致）─────────

export interface ProductRecord {
  id: string
  productNo: string
  title: string
  shortTitle: string | null
  category: string | null
  description: string | null
  folderName: string
  r2BasePath: string | null
  r2BaseUrl: string | null
  r2SyncedAt: string | null
  pimSyncedAt: string | null
  mainImageUrl: string | null
  imagesJson: ProductJsonR2Images | null
  outerPackagingJson: OuterPackaging | null
  toolVersion: string | null
  status: ProductStatus
  createdAt: string
  updatedAt: string
}

export interface ProductSkuRecord {
  id: string
  productId: string
  skuCode: string
  skuName: string
  imageUrl: string | null
  originalImage: string | null
  size: string | null
  weightG: number | null
  costPrice: number | null
  sellingPrice: number | null
  stock: number | null
  barcode: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ProductPlatformRecord {
  id: string
  productId: string
  platform: Platform
  platformTitle: string | null
  platformCategory: string | null
  platformPrice: number | null
  platformAttributes: Record<string, unknown> | null
  exportStatus: string
  lastExportedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SyncLogRecord {
  id: string
  trigger: SyncTrigger
  totalScanned: number
  newCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
  status: SyncStatus
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
}

export interface ExportRecord {
  id: string
  platform: Platform
  productIds: string[]
  fileName: string | null
  fileUrl: string | null
  exportedBy: string | null
  createdAt: string
}

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

// ── API 响应类型 ──────────────────────────────────────────────────────────

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
