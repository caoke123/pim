/** shared/types/api.ts — API 响应类型定义 */

import type { Platform, PlatformPublishStatus, ProductStatus, PublishTaskStatus, LogLevel } from '../enums'

// ── 通用响应格式 ──

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

// ── 产品列表项 (摘要) ──

export interface ProductListItem {
  id: string
  spuCode: string
  title: string
  category: string | null
  mainImageUrl: string | null
  status: ProductStatus
  skuCount: number
  priceMin: number | null
  priceMax: number | null
  createdAt: string
  updatedAt: string
}

// ── 产品详情 ──

export interface ProductDetail {
  id: string
  spuCode: string
  title: string
  description: string | null
  category: string | null
  mainImageUrl: string | null
  status: ProductStatus
  images: ProductImages
  shopeeTitleEn: string | null
  shopeeTitleZh: string | null
  shopeeDescEn: string | null
  shopeeDescZh: string | null
  platforms: PlatformInfo[]
  skus: SkuDetail[]
  createdAt: string
  updatedAt: string
}

// ── SKU 详情 ──

export interface SkuDetail {
  id: string
  skuCode: string
  nameZh: string | null
  nameEn: string | null
  nameZhCustom: string | null
  nameEnCustom: string | null
  weightG: number | null
  size: string | null
  costPrice: number | null
  sellingPrice: number | null
  stock: number | null
  imageUrl: string | null
  sortOrder: number
}

// ── 平台发布信息 ──

export interface PlatformInfo {
  platform: Platform
  title: string | null
  status: PlatformPublishStatus
  category: string[]
  publishedAt: string | null
  shopeeItemId: string | null
}

// ── 图片资源 ──

export interface ProductImages {
  main: ImageItem[]
  sku: ImageItem[]
  detail: ImageItem[]
}

export interface ImageItem {
  url: string
  type: string
  fileName: string
  index: number
}

// ── 统计概览 ──

export interface StatsOverview {
  totalProducts: number
  readyProducts: number
  activeProducts: number
  lastSyncedAt: string | null
  platformStats: PlatformStats[]
}

export interface PlatformStats {
  platform: Platform
  total: number
  lastExportedAt: string | null
}

// ── 发布任务 ──

export interface PublishTaskItem {
  id: string
  spuCode: string
  title: string
  mainImageUrl: string | null
  platform: string
  status: PublishTaskStatus
  machineName: string
  startedAt: string
  duration: string
  errorInfo?: string
  screenshotUrl?: string
  logs: PublishTaskLog[]
}

export interface PublishTaskLog {
  time: string
  message: string
}

// ── 操作日志 ──

export interface OperationLog {
  id: string
  level: LogLevel
  message: string
  spuCode?: string
  platform?: string
  operator: string
  time: string
}

// ── 产品图册 ──

export interface CatalogItem {
  id: string
  name: string
  productCount: number
  hasPassword: boolean
  isActive: boolean
  createdAt: string
}

// ── 分销商 ──

export interface DistributorItem {
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
