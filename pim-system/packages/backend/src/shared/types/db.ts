/** shared/types/db.ts — 数据库行类型 (InferSelect)，严格匹配真实DB结构 */

import type {
  products,
  productSkus,
  spus,
  skus,
  assets,
  publishLogs,
  pimPublishTasks,
} from '../db/schema'

// ── 产品主表 ──
export type ProductRow = typeof products.$inferSelect

// ── PIM SKU 表 ──
export type ProductSkuRow = typeof productSkus.$inferSelect

// ── 原始分拣 SPU 表 ──
export type SpuRow = typeof spus.$inferSelect

// ── 原始分拣 SKU 表 ──
export type SkuRow = typeof skus.$inferSelect

// ── 素材表 ──
export type AssetRow = typeof assets.$inferSelect

// ── 发布日志表 ──
export type PublishLogRow = typeof publishLogs.$inferSelect

// ── PIM 发布任务表 ──
export type PimPublishTaskRow = typeof pimPublishTasks.$inferSelect
export type PublishTaskInsert = typeof pimPublishTasks.$inferInsert

// ── Insert 类型 ──
export type ProductInsert = typeof products.$inferInsert
export type ProductSkuInsert = typeof productSkus.$inferInsert
export type SpuInsert = typeof spus.$inferInsert
export type SkuInsert = typeof skus.$inferInsert
export type AssetInsert = typeof assets.$inferInsert
export type PublishLogInsert = typeof publishLogs.$inferInsert

// ── JSONB 子结构 ──

/** images_json 中的图片条目 */
export interface ImageEntry {
  index: number
  r2Url: string
  fileName: string
  localPath: string
}

/** images_json 完整结构 */
export interface ImagesJson {
  main: ImageEntry[]
  detail: ImageEntry[]
  sku?: ImageEntry[]
}

/** size_json 结构 */
export interface SizeJson {
  unit: string
  width: number
  height: number
  length: number
}

/** 平台属性 */
export interface PlatformAttributes {
  brand?: string
  origin?: string
  [key: string]: string | undefined
}

/** 平台物流配置 */
export interface PlatformLogistics {
  jit?: boolean
  leadTime?: number
  minimumOrderQty?: number
}

/** 平台邀请码配置 */
export interface PlatformInvitation {
  code?: string
}

/** platforms_json 中的单个平台配置 */
export interface PlatformConfig {
  title: string
  status: string
  category: string[]
  logistics?: PlatformLogistics
  attributes?: PlatformAttributes
  invitation?: PlatformInvitation
  description?: string
  publishedAt: string | null
  shopeeItemId: string | null
}

/** platforms_json 完整结构 */
export interface PlatformsJson {
  shopee?: PlatformConfig
  temu?: PlatformConfig
  miaoshou?: PlatformConfig
}

/** spus 外箱包装信息 */
export interface OuterPackaging {
  length: number
  width: number
  height: number
  weight: number
}
