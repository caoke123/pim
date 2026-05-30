/** modules/products/products.dto.ts — 产品模块 DTO 与 Response 类型 */

import type { ProductStatus } from '../../shared/enums'

// ── 查询参数 ──

export interface ProductListQueryDTO {
  page?: number
  pageSize?: number
  keyword?: string
  status?: ProductStatus
  platform?: string
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'spuCode'
  order?: 'asc' | 'desc'
}

// ── 产品列表项 (Response) ──

export interface ProductListItemResponse {
  id: string
  spuCode: string
  title: string
  category: string | null
  mainImageUrl: string | null
  status: ProductStatus
  skuCount: number
  minPrice: number | null
  maxPrice: number | null
  platformStatus: Record<string, PlatformStatusBrief>
  problemFlags: ProblemFlags
  createdAt: string
  updatedAt: string
}

export interface PlatformStatusBrief {
  status: string
  title: string | null
}

export interface ProblemFlags {
  missingMainImage: boolean
  missingPrice: boolean
  missingDescription: boolean
  missingCategory: boolean
  missingSkuImage: boolean
  hasNullSpuCode: boolean
}

// ── 产品详情 (Response) ──

export interface ProductDetailResponse {
  id: string
  spuCode: string
  title: string
  category: string | null
  description: string | null
  mainImageUrl: string | null
  status: ProductStatus
  images: {
    main: ImageItemResponse[]
    detail: ImageItemResponse[]
    sku: ImageItemResponse[]
  }
  outerPackaging: OuterPackagingResponse | null
  skus: SkuDetailResponse[]
  platforms: PlatformDetailResponse[]
  problemFlags: ProblemFlags
  shopeeTitleEn: string | null
  shopeeTitleZh: string | null
  shopeeDescEn: string | null
  shopeeDescZh: string | null
  createdAt: string
  updatedAt: string
}

export interface ImageItemResponse {
  url: string
  fileName: string
  index: number
}

export interface OuterPackagingResponse {
  length: number
  width: number
  height: number
  weight: number
}

export interface SkuDetailResponse {
  id: string
  skuCode: string
  nameZh: string | null
  nameEn: string | null
  nameZhCustom: string | null
  nameEnCustom: string | null
  weightG: number | null
  size: SizeResponse | null
  costPrice: number | null
  sellingPrice: number | null
  stock: number
  imageUrl: string | null
  sortOrder: number
}

export interface SizeResponse {
  unit: string
  length: number
  width: number
  height: number
}

export interface PlatformDetailResponse {
  platform: string
  title: string | null
  status: string
  category: string[]
  attributes: Record<string, string> | null
  description: string | null
  publishedAt: string | null
  itemId: string | null
}

// ── 编辑请求 DTO ──

export interface ProductBasicUpdateDTO {
  title?: string
  category?: string
  description?: string
  status?: ProductStatus
  shopeeTitleEn?: string
  shopeeTitleZh?: string
  shopeeDescEn?: string
  shopeeDescZh?: string
  pimNotes?: string
}

export interface SkuUpdateItemDTO {
  skuId: string
  sellingPrice?: number
  costPrice?: number
  stock?: number
  weightG?: number
  size?: string
  sizeJson?: { length: number; width: number; height: number; unit: string }
  nameZhCustom?: string
  nameEnCustom?: string
}

export interface SkusUpdateDTO {
  skus: SkuUpdateItemDTO[]
}
