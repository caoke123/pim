/** shared/enums/index.ts — 统一枚举定义，前后端共用规范 */

// ── 产品状态 (真实DB: products.status, 从 pending → ready → active → archived) ──
export const ProductStatus = {
  PENDING: 'pending',
  READY: 'ready',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus]

// ── 平台标识 ──
export const Platform = {
  SHOPEE: 'shopee',
  TEMU: 'temu',
  MIAOSHOU: 'miaoshou',
} as const
export type Platform = (typeof Platform)[keyof typeof Platform]

// ── 平台发布状态 (product_platforms / platforms_json[].status) ──
export const PlatformPublishStatus = {
  IDLE: 'idle',
  PENDING: 'pending',
  LIVE: 'live',
  ERROR: 'error',
} as const
export type PlatformPublishStatus = (typeof PlatformPublishStatus)[keyof typeof PlatformPublishStatus]

// ── 发布任务状态 (publish_logs / 前端发布队列) ──
export const PublishTaskStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
} as const
export type PublishTaskStatus = (typeof PublishTaskStatus)[keyof typeof PublishTaskStatus]

// ── 同步触发方式 ──
export const SyncTrigger = {
  AUTO: 'auto',
  MANUAL: 'manual',
} as const
export type SyncTrigger = (typeof SyncTrigger)[keyof typeof SyncTrigger]

// ── 同步状态 ──
export const SyncStatus = {
  RUNNING: 'running',
  DONE: 'done',
  FAILED: 'failed',
} as const
export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus]

// ── 素材类型 (asset_type_enum) ──
export const AssetType = {
  MAIN_IMAGE: 'main_image',
  SKU_IMAGE: 'sku_image',
  DETAIL_IMAGE: 'detail_image',
  VIDEO: 'video',
} as const
export type AssetType = (typeof AssetType)[keyof typeof AssetType]

// ── 素材状态 (asset_status_enum) ──
export const AssetStatus = {
  PENDING: 'pending',
  PUBLISHED: 'published',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const
export type AssetStatus = (typeof AssetStatus)[keyof typeof AssetStatus]

// ── 图片分段 (前端 images tab 使用) ──
export const ImageSegment = {
  MAIN: '主图',
  SKU: 'SKU图',
  DETAIL: '详情图',
  SIZE: '尺寸图',
  VIDEO: '视频',
} as const
export type ImageSegment = (typeof ImageSegment)[keyof typeof ImageSegment]

// ── 分销商定价方式 ──
export const PriceType = {
  SELLING: 'selling',
  COST: 'cost',
  CUSTOM: 'custom',
} as const
export type PriceType = (typeof PriceType)[keyof typeof PriceType]

// ── 导出状态 ──
export const ExportStatus = {
  DRAFT: 'draft',
  EXPORTED: 'exported',
} as const
export type ExportStatus = (typeof ExportStatus)[keyof typeof ExportStatus]

// ── 日志级别 ──
export const LogLevel = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel]
