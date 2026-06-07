/** shared/db/schema.ts — Drizzle ORM Schema, 严格匹配真实 PostgreSQL 数据库 sorter */

import { sql } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  smallint,
  bigint,
  pgEnum,
  unique,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'

// ── PostgreSQL 自定义枚举 (已在数据库中创建) ──

export const assetTypeEnum = pgEnum('asset_type_enum', [
  'main_image',
  'sku_image',
  'detail_image',
  'video',
])

export const assetStatusEnum = pgEnum('asset_status_enum', [
  'pending',
  'published',
  'failed',
  'skipped',
])

// ═══════════════════════════════════════════════════════════════════════════════
// spus — 原始分拣系统 SPU 数据
// ═══════════════════════════════════════════════════════════════════════════════

export const spus = pgTable('spus', {
  spuCode: text('spu_code').primaryKey().notNull(),
  spuName: text('spu_name').notNull(),
  shortTitle: text('short_title'),
  categoryCode: text('category_code').notNull(),
  styleCode: text('style_code'),
  outerPackLength: numeric('outer_pack_length'),
  outerPackWidth: numeric('outer_pack_width'),
  outerPackHeight: numeric('outer_pack_height'),
  outerPackWeight: numeric('outer_pack_weight'),
  machineName: text('machine_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// skus — 原始分拣系统 SKU 数据
// ═══════════════════════════════════════════════════════════════════════════════

export const skus = pgTable('skus', {
  skuCode: text('sku_code').primaryKey().notNull(),
  spuCode: text('spu_code').notNull().references(() => spus.spuCode),
  colorName: text('color_name'),
  dimensions: text('dimensions'),
  weight: numeric('weight'),
  costPrice: numeric('cost_price'),
  sellingPrice: numeric('selling_price'),
  machineName: text('machine_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  spuCodeIdx: index('idx_skus_spu_code').on(table.spuCode),
}))

// ═══════════════════════════════════════════════════════════════════════════════
// products — PIM 处理后的产品主表
// ═══════════════════════════════════════════════════════════════════════════════

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  spuCode: varchar('spu_code').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  category: varchar('category'),
  localPath: text('local_path'),
  shopeeTitleEn: text('shopee_title_en'),
  shopeeTitleZh: text('shopee_title_zh'),
  shopeeDescEn: text('shopee_desc_en'),
  shopeeDescZh: text('shopee_desc_zh'),
  platformsJson: jsonb('platforms_json'),
  imagesJson: jsonb('images_json'),
  mainImageUrl: text('main_image_url'),
  r2BasePath: text('r2_base_path'),
  r2SyncedAt: timestamp('r2_synced_at', { withTimezone: true }),
  toolVersion: varchar('tool_version'),
  status: varchar('status', { length: 16 }).default('pending').notNull(),
  pimNotes: text('pim_notes'),
  isDeleted: boolean('is_deleted').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  spuCodeIdx: index('idx_products_spu_code').on(table.spuCode),
  statusIdx: index('idx_products_status').on(table.status),
}))

// ═══════════════════════════════════════════════════════════════════════════════
// product_skus — PIM 处理后的 SKU 表
// ═══════════════════════════════════════════════════════════════════════════════

export const productSkus = pgTable('product_skus', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  spuCode: varchar('spu_code').notNull().references(() => products.spuCode),
  skuCode: varchar('sku_code').notNull().unique(),
  nameZh: varchar('name_zh'),
  nameEn: varchar('name_en'),
  nameZhCustom: varchar('name_zh_custom'),
  nameEnCustom: varchar('name_en_custom'),
  weightG: numeric('weight_g'),
  sizeJson: jsonb('size_json'),
  costPrice: numeric('cost_price'),
  sellingPrice: numeric('selling_price'),
  stock: integer('stock').default(0),
  imageUrl: text('image_url'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  spuCodeIdx: index('idx_product_skus_spu_code').on(table.spuCode),
}))

// ═══════════════════════════════════════════════════════════════════════════════
// assets — 素材表
// ═══════════════════════════════════════════════════════════════════════════════

export const assets = pgTable('assets', {
  id: bigint('id', { mode: 'number' }).primaryKey().notNull(),
  spuCode: text('spu_code').notNull().references(() => spus.spuCode),
  skuCode: text('sku_code').references(() => skus.skuCode),
  assetType: assetTypeEnum('asset_type').notNull(),
  filePath: text('file_path').notNull(),
  machineName: text('machine_name').notNull(),
  status: assetStatusEnum('status').default('pending').notNull(),
  sortOrder: smallint('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
}, (table) => ({
  spuCodeIdx: index('idx_assets_spu_code').on(table.spuCode),
  skuCodeIdx: index('idx_assets_sku_code').on(table.skuCode),
  machineIdx: index('idx_assets_machine').on(table.machineName),
  statusIdx: index('idx_assets_status').on(table.status),
}))

// ═══════════════════════════════════════════════════════════════════════════════
// publish_logs — 发布日志表
// ═══════════════════════════════════════════════════════════════════════════════

export const publishLogs = pgTable('publish_logs', {
  id: bigint('id', { mode: 'number' }).primaryKey().notNull(),
  spuCode: text('spu_code').notNull(),
  assetId: bigint('asset_id', { mode: 'number' }).references(() => assets.id),
  machineName: text('machine_name').notNull(),
  shopeeItemId: text('shopee_item_id'),
  result: text('result').notNull(),
  errorMessage: text('error_message'),
  executedAt: timestamp('executed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  spuCodeIdx: index('idx_publish_logs_spu_code').on(table.spuCode),
  resultIdx: index('idx_publish_logs_result').on(table.result),
}))

// ═══════════════════════════════════════════════════════════════════════════════
// pim_publish_tasks — PIM 发布任务表
// ═══════════════════════════════════════════════════════════════════════════════

export const pimPublishTasks = pgTable('pim_publish_tasks', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  platform: varchar('platform', { length: 50 }).notNull(),
  productIds: text('product_ids').array().notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  progress: integer('progress').default(0),
  logLines: jsonb('log_lines').default([]),
  error: text('error'),
  operator: varchar('operator', { length: 50 }).default('XP'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  statusIdx: index('idx_pim_publish_tasks_status').on(table.status),
  createdIdx: index('idx_pim_publish_tasks_created').on(table.createdAt),
}))

// ═══════════════════════════════════════════════════════════════════════════════
// operation_logs — 操作日志表
// ═══════════════════════════════════════════════════════════════════════════════

export const operationLogs = pgTable('operation_logs', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  operator: varchar('operator', { length: 50 }).default('XP').notNull(),
  spuCode: varchar('spu_code', { length: 100 }),
  productId: uuid('product_id'),
  action: varchar('action', { length: 100 }).notNull(),
  fieldName: varchar('field_name', { length: 100 }),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  level: varchar('level', { length: 20 }).default('info').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  spuCodeIdx: index('idx_operation_logs_spu_code').on(table.spuCode),
  createdIdx: index('idx_operation_logs_created').on(table.createdAt),
}))

// ═══════════════════════════════════════════════════════════════════════════════
// catalogs — 产品图册表
// ═══════════════════════════════════════════════════════════════════════════════

export const catalogs = pgTable('catalogs', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  coverImageUrl: text('cover_image_url'),
  productIds: uuid('product_ids').array().notNull().default(sql`'{}'::uuid[]`),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  r2Path: text('r2_path'),
  publicUrl: text('public_url'),
  coverImageKey: text('cover_image_key'),
  viewCount: integer('view_count').notNull().default(0),
  lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  operator: varchar('operator', { length: 50 }).default('XP'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  statusIdx: index('idx_catalogs_status').on(table.status),
  createdIdx: index('idx_catalogs_created').on(table.createdAt),
}))

// ═══════════════════════════════════════════════════════════════════════════════
// 分销管理
// ═══════════════════════════════════════════════════════════════════════════════

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 100 }),
  phone: varchar('phone', { length: 50 }),
  wechat: varchar('wechat', { length: 100 }),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  operator: varchar('operator', { length: 50 }).default('XP'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  statusIdx: index('idx_customers_status').on(table.status),
  createdIdx: index('idx_customers_created').on(table.createdAt),
}))

export const distributions = pgTable('distributions', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  catalogId: uuid('catalog_id').notNull().references(() => catalogs.id, { onDelete: 'restrict' }),
  agreement: text('agreement'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  publicUrl: text('public_url'),
  operator: varchar('operator', { length: 50 }).default('XP'),
  showCustomerName: boolean('show_customer_name').default(false),
  r2Path: text('r2_path'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const distributionSkuPrices = pgTable('distribution_sku_prices', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  distributionId: uuid('distribution_id').notNull().references(() => distributions.id, { onDelete: 'cascade' }),
  skuId: uuid('sku_id').notNull().references(() => productSkus.id, { onDelete: 'cascade' }),
  spuCode: varchar('spu_code', { length: 100 }).notNull(),
  customerPrice: numeric('customer_price', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniq: unique().on(table.distributionId, table.skuId),
}))

// ═══════════════════════════════════════════════════════════════════════════════
// sync_logs — R2 同步日志
// ═══════════════════════════════════════════════════════════════════════════════

export const syncLogs = pgTable('sync_logs', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  trigger: varchar('trigger', { length: 20 }).notNull(),
  totalScanned: integer('total_scanned').default(0),
  newCount: integer('new_count').default(0),
  updatedCount: integer('updated_count').default(0),
  skippedCount: integer('skipped_count').default(0),
  failedCount: integer('failed_count').default(0),
  status: varchar('status', { length: 20 }).notNull(),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
})
