/** api/types.ts — 后端 API 返回类型定义 */

export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
  requestId: string
  timestamp: string
}

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ProductListItem {
  id: string
  spuCode: string
  title: string
  category: string | null
  mainImageUrl: string | null
  status: string
  skuCount: number
  minPrice: number | null
  maxPrice: number | null
  platformStatus: Record<string, { status: string; title: string | null }>
  problemFlags: ProblemFlags
  createdAt: string
  updatedAt: string
}

export interface ProblemFlags {
  missingMainImage: boolean
  missingPrice: boolean
  missingDescription: boolean
  missingCategory: boolean
  missingSkuImage: boolean
  hasNullSpuCode: boolean
}

export interface ProductDetail {
  id: string
  spuCode: string
  title: string
  category: string | null
  description: string | null
  mainImageUrl: string | null
  status: string
  images: {
    main: ImageItem[]
    detail: ImageItem[]
    sku: ImageItem[]
  }
  outerPackaging: null | { length: number; width: number; height: number; weight: number }
  skus: SkuDetail[]
  platforms: PlatformDetail[]
  problemFlags: ProblemFlags
  shopeeTitleEn: string | null
  shopeeTitleZh: string | null
  shopeeDescEn: string | null
  shopeeDescZh: string | null
  createdAt: string
  updatedAt: string
}

export interface ImageItem {
  url: string
  fileName: string
  index: number
}

export interface SkuDetail {
  id: string
  skuCode: string
  nameZh: string | null
  nameEn: string | null
  nameZhCustom: string | null
  nameEnCustom: string | null
  weightG: number | null
  size: { unit: string; length: number; width: number; height: number } | null
  costPrice: number | null
  sellingPrice: number | null
  stock: number
  imageUrl: string | null
  sortOrder: number
}

export interface PlatformDetail {
  platform: string
  title: string | null
  status: string
  category: string[]
  attributes: Record<string, string> | null
  description: string | null
  publishedAt: string | null
  itemId: string | null
}

export interface StatsOverview {
  totalProducts: number
  readyProducts: number
  activeProducts: number
  pendingProducts: number
  failedPublishTasks: number
  lastSyncedAt: string | null
  platformStats: { platform: string; total: number; lastExportedAt: string | null }[]
}
