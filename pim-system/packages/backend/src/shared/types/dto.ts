/** shared/types/dto.ts — 请求 DTO 类型定义 */

import type { Platform, ProductStatus } from '../enums'

// ── 产品列表查询参数 ──

export interface ProductListQuery {
  page?: number
  pageSize?: number
  search?: string
  status?: ProductStatus
  category?: string
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'spuCode'
  sortOrder?: 'asc' | 'desc'
}

// ── 产品更新请求 ──

export interface ProductUpdateDTO {
  title?: string
  category?: string
  description?: string
  status?: ProductStatus
  mainImageUrl?: string
  shopeeTitleEn?: string
  shopeeTitleZh?: string
  shopeeDescEn?: string
  shopeeDescZh?: string
  pimNotes?: string
  localPath?: string
}

// ── SKU 更新请求 ──

export interface SkuUpdateDTO {
  size?: string
  weightG?: number
  costPrice?: number
  sellingPrice?: number
  stock?: number
  nameZhCustom?: string
  nameEnCustom?: string
}

// ── 平台配置请求 ──

export interface PlatformConfigDTO {
  platformTitle?: string
  platformCategory?: string
  platformPrice?: number
  platformAttributes?: Record<string, unknown>
  exportStatus?: string
}

// ── 导出请求 ──

export interface ExportRequest {
  productIds: string[]
  platform: Platform
  options?: {
    priceMarkup?: number
  }
}

// ── 发布请求 ──

export interface PublishRequest {
  productIds: string[]
  platform: Platform
}

// ── 图册创建请求 ──

export interface CatalogCreateDTO {
  name: string
  password?: string
  productIds?: string[]
}

// ── 分销商创建/更新请求 ──

export interface DistributorCreateDTO {
  name: string
  contact?: string
  allowedCategories?: string[] | null
  priceType?: 'selling' | 'cost' | 'custom'
  priceMarkup?: number
  isActive?: boolean
}

export interface DistributorUpdateDTO {
  name?: string
  contact?: string
  allowedCategories?: string[] | null
  priceType?: 'selling' | 'cost' | 'custom'
  priceMarkup?: number
  isActive?: boolean
}
