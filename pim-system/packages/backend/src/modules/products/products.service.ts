/** modules/products/products.service.ts — 产品业务逻辑层 (聚合/计算/日志) */

import { productsRepository, productSkusRepository } from '../../repositories'
import { OperationLog } from '../../services/operation-log.service'
import { evaluateProblemFlags } from '../../rules/problemFlags'
import type {
  ProductListItemResponse,
  ProductDetailResponse,
  ProductBasicUpdateDTO,
  SkusUpdateDTO,
  ProblemFlags,
  PlatformStatusBrief,
} from './products.dto'
import type { ProductRow, ProductSkuRow, PlatformsJson, PlatformConfig, ImagesJson, SizeJson } from '../../shared/types'

// fieldLabels 暂存, 用于日志 message 中文映射
const FIELD_LABELS: Record<string, string> = {
  title: '标题', category: '类目', description: '描述', status: '状态',
  sellingPrice: '售价', costPrice: '成本价', stock: '库存',
  weightG: '重量', nameZhCustom: 'SKU自定义中文名', nameEnCustom: 'SKU自定义英文名',
  sizeJson: '尺寸', shopeeTitleEn: 'Shopee英文标题', shopeeTitleZh: 'Shopee中文标题',
  shopeeDescEn: 'Shopee英文描述', shopeeDescZh: 'Shopee中文描述', pimNotes: '备注',
}

function toNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

/** 计算问题标记 (使用规则配置) */
function computeFlags(
  product: ProductRow,
  skuCount: number,
  skuPrices: (number | null)[],
  hasSkuMissingImage: boolean,
): ProblemFlags {
  return evaluateProblemFlags({
    mainImageUrl: product.mainImageUrl,
    description: product.description,
    category: product.category,
    spuCode: product.spuCode,
    skuPrices,
    skuCount,
    hasSkuMissingImage,
  })
}

/** 解析 platforms_json 提取平台状态 */
function parsePlatformStatus(platformsJson: PlatformsJson | null): Record<string, PlatformStatusBrief> {
  const result: Record<string, PlatformStatusBrief> = {}
  if (!platformsJson) return result

  for (const [key, config] of Object.entries(platformsJson)) {
    if (config && typeof config === 'object') {
      result[key] = {
        status: (config as PlatformConfig).status || 'idle',
        title: (config as PlatformConfig).title || null,
      }
    }
  }
  return result
}

/** 解析 images_json 为前端可用格式 */
function parseImages(imagesJson: unknown): ProductDetailResponse['images'] {
  const defaultImages = { main: [], detail: [], sku: [] }

  if (!imagesJson || typeof imagesJson !== 'object') return defaultImages

  const img = imagesJson as ImagesJson

  return {
    main: (img.main || []).map(m => ({
      url: m.r2Url || m.localPath || '',
      fileName: m.fileName,
      index: m.index,
    })),
    detail: (img.detail || []).map(d => ({
      url: d.r2Url || d.localPath || '',
      fileName: d.fileName,
      index: d.index,
    })),
    sku: (img.sku || []).map(s => ({
      url: s.r2Url || s.localPath || '',
      fileName: s.fileName,
      index: s.index,
    })),
  }
}

/** 解析 size_json */
function parseSize(sizeJson: unknown): { unit: string; length: number; width: number; height: number } | null {
  if (!sizeJson || typeof sizeJson !== 'object') return null
  const s = sizeJson as SizeJson
  return {
    unit: s.unit || 'cm',
    length: s.length || 0,
    width: s.width || 0,
    height: s.height || 0,
  }
}

/** 映射 SKU 行到响应 */
function mapSkuToResponse(sku: ProductSkuRow) {
  return {
    id: sku.id,
    skuCode: sku.skuCode,
    nameZh: sku.nameZh,
    nameEn: sku.nameEn,
    nameZhCustom: sku.nameZhCustom,
    nameEnCustom: sku.nameEnCustom,
    weightG: toNumber(sku.weightG),
    size: parseSize(sku.sizeJson),
    costPrice: toNumber(sku.costPrice),
    sellingPrice: toNumber(sku.sellingPrice),
    stock: sku.stock ?? 0,
    imageUrl: sku.imageUrl,
    sortOrder: sku.sortOrder ?? 0,
  }
}

/** 解析外箱包装 */
function parseOuterPackaging(product: ProductRow): { length: number; width: number; height: number; weight: number } | null {
  return null // products 表没有 outer_packaging 字段, 需要从 spus 表关联获取, 暂留
}

// ═══════════════════════════════════════════════════════════════════════════════
// ProductsService
// ═══════════════════════════════════════════════════════════════════════════════

export class ProductsService {
  /** 产品列表 (含聚合) */
  async getProductList(params: {
    page?: number
    pageSize?: number
    keyword?: string
    status?: string
    platform?: string
    sortBy?: string
    order?: string
  }): Promise<{ items: ProductListItemResponse[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, params.page || 1)
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20))

    // 1. 查询产品分页
    const { items: products, total } = await productsRepository.findMany({
      page,
      pageSize,
      search: params.keyword,
      status: params.status as any,
      sortBy: (params.sortBy as any) || 'createdAt',
      sortOrder: (params.order as any) || 'desc',
    })

    if (products.length === 0) {
      return { items: [], total, page, pageSize }
    }

    // 2. 批量获取 SKU 计数和价格
    const spuCodes = products.map(p => p.spuCode).filter(Boolean)
    const skuCounts = await productSkusRepository.countMapBySpuCodes(spuCodes)

    // 3. 为每个产品获取 SKU 详情 (用于价格计算)
    const priceCache = new Map<string, { min: number | null; max: number | null; hasSkuImage: boolean }>()

    for (const spuCode of spuCodes) {
      const skus = await productSkusRepository.findBySpuCode(spuCode)
      const prices = skus
        .map(s => toNumber(s.sellingPrice))
        .filter((p): p is number => p !== null && p > 0)

      priceCache.set(spuCode, {
        min: prices.length > 0 ? Math.min(...prices) : null,
        max: prices.length > 0 ? Math.max(...prices) : null,
        hasSkuImage: skus.every(s => !!s.imageUrl),
      })
    }

    // 4. 构建响应 (platform 筛选在 SQL 后过滤)
    let result = products.map(product => {
      const priceInfo = priceCache.get(product.spuCode) || { min: null, max: null, hasSkuImage: false }
      const platformStatus = parsePlatformStatus(product.platformsJson as PlatformsJson | null)
      const skuPrices = priceInfo.min !== null ? [priceInfo.min] : []

      const problemFlags = computeFlags(
        product,
        skuCounts[product.spuCode] || 0,
        skuPrices.length > 0 ? [skuPrices[0]] : [],
        !priceInfo.hasSkuImage,
      )

      return {
        id: product.id,
        spuCode: product.spuCode,
        title: product.title,
        category: product.category,
        mainImageUrl: product.mainImageUrl,
        status: product.status as ProductListItemResponse['status'],
        skuCount: skuCounts[product.spuCode] || 0,
        minPrice: priceInfo.min,
        maxPrice: priceInfo.max,
        platformStatus,
        problemFlags,
        createdAt: product.createdAt instanceof Date ? product.createdAt.toISOString() : String(product.createdAt),
        updatedAt: product.updatedAt instanceof Date ? product.updatedAt.toISOString() : String(product.updatedAt),
      }
    })

    // 5. 平台筛选 (platforms_json 是 JSONB, 在应用层过滤)
    if (params.platform) {
      result = result.filter(p => params.platform! in p.platformStatus)
    }

    // 6. 按平台状态排序 (如果指定了 platform, 将已发布的排前面)
    if (params.platform) {
      result.sort((a, b) => {
        const sa = a.platformStatus[params.platform!]?.status || 'idle'
        const sb = b.platformStatus[params.platform!]?.status || 'idle'
        const order = { live: 0, pending: 1, idle: 2, error: 3 } as Record<string, number>
        return (order[sa] ?? 99) - (order[sb] ?? 99)
      })
    }

    return { items: result, total, page, pageSize }
  }

  /** 产品详情 */
  async getProductDetail(productId: string): Promise<ProductDetailResponse | null> {
    const product = await productsRepository.findById(productId)
    if (!product) return null

    // 加载 SKU
    const skus = await productSkusRepository.findBySpuCode(product.spuCode)

    // 构建 platforms
    const platformsJson = product.platformsJson as PlatformsJson | null
    const platforms: ProductDetailResponse['platforms'] = []

    if (platformsJson) {
      for (const [key, config] of Object.entries(platformsJson)) {
        if (config && typeof config === 'object') {
          const c = config as PlatformConfig
          platforms.push({
            platform: key,
            title: c.title || null,
            status: c.status || 'idle',
            category: c.category || [],
            attributes: (c.attributes || null) as Record<string, string> | null,
            description: c.description || null,
            publishedAt: c.publishedAt,
            itemId: c.shopeeItemId,
          })
        }
      }
    }

    // 构建 problemFlags
    const skuPrices = skus.map(s => toNumber(s.sellingPrice)).filter(p => p !== null && p > 0)
    const problemFlags = computeFlags(
      product,
      skus.length,
      skuPrices,
      skus.some(s => !s.imageUrl),
    )

    return {
      id: product.id,
      spuCode: product.spuCode,
      title: product.title,
      category: product.category,
      description: product.description,
      mainImageUrl: product.mainImageUrl,
      status: product.status as ProductDetailResponse['status'],
      images: parseImages(product.imagesJson),
      outerPackaging: parseOuterPackaging(product),
      skus: skus.map(mapSkuToResponse),
      platforms,
      problemFlags,
      shopeeTitleEn: product.shopeeTitleEn,
      shopeeTitleZh: product.shopeeTitleZh,
      shopeeDescEn: product.shopeeDescEn,
      shopeeDescZh: product.shopeeDescZh,
      createdAt: product.createdAt instanceof Date ? product.createdAt.toISOString() : String(product.createdAt),
      updatedAt: product.updatedAt instanceof Date ? product.updatedAt.toISOString() : String(product.updatedAt),
    }
  }

  /** 编辑产品基础信息 */
  async updateBasic(
    productId: string,
    dto: ProductBasicUpdateDTO,
    operator = 'admin',
  ): Promise<ProductRow | null> {
    const existing = await productsRepository.findById(productId)
    if (!existing) return null

    // 只更新允许的字段
    const allowedFields = [
      'title', 'category', 'description', 'status',
      'shopeeTitleEn', 'shopeeTitleZh', 'shopeeDescEn', 'shopeeDescZh', 'pimNotes',
    ] as const

    const updateData: Record<string, unknown> = {}
    const changes: Record<string, { old: unknown; new: unknown }> = {}

    for (const key of allowedFields) {
      const dtoKey = key as keyof ProductBasicUpdateDTO
      if (dto[dtoKey] !== undefined && dto[dtoKey] !== (existing as any)[key]) {
        changes[key] = { old: (existing as any)[key], new: dto[dtoKey] }
        updateData[key] = dto[dtoKey]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return existing // 无变更
    }

    const updated = await productsRepository.update(productId, updateData as any)

    // 写入操作日志 (一条汇总)
    if (updated) {
      const cnFields = Object.keys(changes).map(f => FIELD_LABELS[f] ?? f)
      OperationLog.success({
        operator,
        spuCode: updated.spuCode,
        productId: updated.id,
        action: 'UPDATE_PRODUCT',
        message: `更新产品基础信息（${cnFields.join('、')}）`,
      })
    }

    return updated
  }

  /** 批量更新 SKU */
  async updateSkus(
    productId: string,
    dto: SkusUpdateDTO,
    operator = 'admin',
  ): Promise<{ updated: number; failed: { skuId: string; reason: string }[] } | null> {
    const product = await productsRepository.findById(productId)
    if (!product) return null

    let updated = 0
    const failed: { skuId: string; reason: string }[] = []
    const changedSkus: string[] = []
    const changedFields = new Set<string>()

    for (const item of dto.skus) {
      const sku = await productSkusRepository.findByProductAndId(product.spuCode, item.skuId)
      if (!sku) {
        failed.push({ skuId: item.skuId, reason: 'SKU 不属于该产品或不存在' })
        continue
      }

      const updateData: Record<string, unknown> = {}
      let hasChanges = false

      const fieldMap: Array<{ key: keyof typeof item; dbKey: string }> = [
        { key: 'sellingPrice', dbKey: 'sellingPrice' },
        { key: 'costPrice', dbKey: 'costPrice' },
        { key: 'stock', dbKey: 'stock' },
        { key: 'weightG', dbKey: 'weightG' },
        { key: 'nameZhCustom', dbKey: 'nameZhCustom' },
        { key: 'nameEnCustom', dbKey: 'nameEnCustom' },
      ]

      for (const { key, dbKey } of fieldMap) {
        if (item[key] !== undefined) {
          const newVal = item[key]
          const oldVal = (sku as any)[dbKey]
          if (String(newVal) !== String(oldVal)) {
            updateData[dbKey] = key === 'sellingPrice' || key === 'costPrice'
              ? String(newVal)
              : key === 'stock' || key === 'weightG'
                ? Number(newVal)
                : newVal
            hasChanges = true
            changedFields.add(dbKey)
          }
        }
      }

      if (item.size !== undefined && item.size !== String(sku.sizeJson)) {
        updateData['sizeJson'] = item.size
        hasChanges = true
        changedFields.add('sizeJson')
      }

      // 处理 sizeJson 对象格式 (前端长宽高编辑)
      if (item.sizeJson !== undefined) {
        const newSizeStr = JSON.stringify(item.sizeJson)
        const oldSizeStr = sku.sizeJson ? JSON.stringify(sku.sizeJson) : ''
        if (newSizeStr !== oldSizeStr) {
          updateData['sizeJson'] = item.sizeJson
          hasChanges = true
          changedFields.add('sizeJson')
        }
      }

      if (!hasChanges) continue

      const result = await productSkusRepository.update(item.skuId, updateData as any)
      if (result) {
        updated++
        changedSkus.push(sku.skuCode)
      } else {
        failed.push({ skuId: item.skuId, reason: '更新失败' })
      }
    }

    // 写入一条汇总日志
    if (updated > 0) {
      const cnFields = Array.from(changedFields).map(f => FIELD_LABELS[f] ?? f)
      let message: string

      if (updated === 1 && cnFields.length === 1) {
        message = `更新SKU ${changedSkus[0]} ${cnFields[0]}`
      } else if (updated === 1) {
        message = `更新SKU ${changedSkus[0]}（${cnFields.join('、')}）`
      } else if (cnFields.length === 1) {
        message = `批量更新 ${updated} 个SKU 的${cnFields[0]}`
      } else {
        message = `批量更新 ${updated} 个SKU（${cnFields.join('、')}）`
      }

      OperationLog.success({
        operator,
        spuCode: product.spuCode,
        productId: product.id,
        action: 'UPDATE_SKU',
        message,
      })
    }

    return { updated, failed }
  }
}

export const productsService = new ProductsService()
