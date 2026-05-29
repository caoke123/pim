/** packages/backend/src/services/distributor/pricing.ts — 分销商价格计算服务 */

/**
 * 价格计算规则：
 * - selling → 返回 sellingPrice
 * - cost    → 返回 costPrice（仅 priceType=cost 时暴露）
 * - custom  → costPrice × (1 + priceMarkup / 100)
 *
 * 返回值保留两位小数
 */

import type { distributors, productSkus } from '../../db/schema'

type DistributorRow = typeof distributors.$inferSelect
type SkuRow = typeof productSkus.$inferSelect

function toPrice(val: string | null): number | null {
  if (val === null) return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

/**
 * 计算单个 SKU 的分销商价格
 * @returns 保留两位小数的价格，无法计算时返回 null
 */
export function calculateSkuPrice(
  sku: SkuRow,
  distributor: DistributorRow,
): number | null {
  const priceType = distributor.priceType

  if (priceType === 'selling') {
    const p = toPrice(sku.sellingPrice as string)
    return p !== null ? round(p) : null
  }

  if (priceType === 'cost') {
    const p = toPrice(sku.costPrice as string)
    return p !== null ? round(p) : null
  }

  if (priceType === 'custom') {
    const cost = toPrice(sku.costPrice as string)
    if (cost === null) return null
    const markup = Number(distributor.priceMarkup) || 0
    return round(cost * (1 + markup / 100))
  }

  return null
}

/** 保留两位小数 */
function round(val: number): number {
  return Math.round(val * 100) / 100
}

/**
 * 根据 allowedCategories 过滤产品
 * @returns true 表示该产品可被该分销商访问
 */
export function isCategoryAllowed(
  productCategory: string | null,
  allowedCategories: string[] | null,
): boolean {
  // null 表示可访问全部
  if (allowedCategories === null) return true
  // [] 表示不允许访问任何产品
  if (allowedCategories.length === 0) return false
  // 有值时仅返回命中的产品
  if (productCategory === null) return false
  return allowedCategories.includes(productCategory)
}
