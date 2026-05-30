/** api/adapter.ts — API 数据 → 前端组件数据 适配器 */

import type { ProductListItem, ProductDetail, ProblemFlags } from './types'
import type { Product, PlatformStatus, SkuItem } from '@/mock'

const PLATFORM_NAMES: Record<string, string> = {
  shopee: 'Shopee',
  temu: 'Temu',
  miaoshou: '妙手ERP',
  tiktok: 'TikTok',
  lazada: 'Lazada',
  amazon: 'Amazon',
}

const STATUS_MAP: Record<string, PlatformStatus['status']> = {
  live: 'live',
  published: 'live',
  pending: 'pending',
  draft: 'idle',
  idle: 'idle',
  error: 'error',
  failed: 'error',
}

function mapPlatformStatus(platformStatus: ProductListItem['platformStatus']): PlatformStatus[] {
  if (!platformStatus) return []
  return Object.entries(platformStatus).map(([key, val]) => ({
    name: (PLATFORM_NAMES[key] || key) as PlatformStatus['name'],
    status: STATUS_MAP[val.status] || 'idle',
  }))
}

export function hasAnyProblem(flags: ProblemFlags): boolean {
  return Object.values(flags).some(Boolean)
}

export function getProblemLabels(flags: ProblemFlags): string[] {
  const labels: string[] = []
  if (flags.missingMainImage) labels.push('缺主图')
  if (flags.missingPrice) labels.push('缺价格')
  if (flags.missingDescription) labels.push('缺描述')
  if (flags.missingCategory) labels.push('缺类目')
  if (flags.missingSkuImage) labels.push('SKU缺图')
  if (flags.hasNullSpuCode) labels.push('编码异常')
  return labels
}

/** 列表项 → Product (兼容现有组件) */
export function listItemToProduct(item: ProductListItem): Product {
  const hasPrice = item.minPrice != null && item.maxPrice != null
  return {
    id: item.id,
    spuCode: item.spuCode,
    spuName: item.title,
    category: item.category || '',
    mainImage: item.mainImageUrl || '',
    salePrice: item.maxPrice ?? 0,
    costPrice: item.minPrice ?? 0,
    skuCount: item.skuCount,
    weight: '',
    dimensions: '',
    status: item.status === 'active' ? 'published' : item.status === 'archived' ? 'draft' : 'approved',
    platforms: mapPlatformStatus(item.platformStatus),
    skus: [],
    description: '',
    images: [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

/** 详情 → Product (兼容现有组件) */
export function detailToProduct(detail: ProductDetail): Product {
  return {
    id: detail.id,
    spuCode: detail.spuCode,
    spuName: detail.title,
    category: detail.category || '',
    mainImage: detail.mainImageUrl || '',
    salePrice: detail.skus.length > 0 ? Math.max(...detail.skus.map(s => s.sellingPrice ?? 0)) : 0,
    costPrice: detail.skus.length > 0 ? Math.min(...detail.skus.map(s => s.costPrice ?? 0)) : 0,
    skuCount: detail.skus.length,
    weight: '',
    dimensions: '',
    status: detail.status === 'active' ? 'published' : detail.status === 'archived' ? 'draft' : 'approved',
    platforms: detail.platforms.map(p => ({
      name: (PLATFORM_NAMES[p.platform] || p.platform) as PlatformStatus['name'],
      status: STATUS_MAP[p.status] || 'idle',
      itemId: p.itemId || undefined,
      publishedAt: p.publishedAt || undefined,
    })),
    skus: detail.skus.map(sku => ({
      id: sku.id,
      code: sku.skuCode,
      color: sku.nameZh || sku.nameEn || sku.skuCode,
      nameEn: sku.nameEn || undefined,
      dimensions: sku.size ? `${sku.size.length}x${sku.size.width}x${sku.size.height}${sku.size.unit}` : '',
      size: sku.size || undefined,
      weight: sku.weightG ? `${sku.weightG}g` : '',
      weightG: sku.weightG ?? undefined,
      stock: sku.stock,
      cost: sku.costPrice ?? 0,
      price: sku.sellingPrice ?? 0,
      imageUrl: sku.imageUrl || undefined,
    })),
    description: detail.description || '',
    images: [
      ...detail.images.main.map(i => ({ url: i.url, type: '主图' })),
      ...detail.images.sku.map(i => ({ url: i.url, type: 'SKU图' })),
      ...detail.images.detail.map(i => ({ url: i.url, type: '详情图' })),
    ],
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  }
}
