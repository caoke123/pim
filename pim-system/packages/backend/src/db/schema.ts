/** packages/backend/src/db/schema.ts — Drizzle ORM 表结构定义 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// ── products 表（4.1节）───────────────────────────────────────────────────

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  productNo: varchar('product_no', { length: 32 }).notNull().unique(),
  title: varchar('title', { length: 200 }).notNull(),
  shortTitle: varchar('short_title', { length: 50 }),
  category: varchar('category', { length: 20 }),
  description: text('description'),
  folderName: varchar('folder_name', { length: 300 }).notNull(),
  r2BasePath: varchar('r2_base_path', { length: 500 }),
  r2BaseUrl: varchar('r2_base_url', { length: 500 }),
  r2SyncedAt: timestamp('r2_synced_at', { withTimezone: true }),
  pimSyncedAt: timestamp('pim_synced_at', { withTimezone: true }),
  mainImageUrl: varchar('main_image_url', { length: 500 }),
  imagesJson: jsonb('images_json'),
  outerPackagingJson: jsonb('outer_packaging_json'),
  toolVersion: varchar('tool_version', { length: 20 }),
  status: varchar('status', { length: 16 }).default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── product_skus 表（4.2节）───────────────────────────────────────────────

export const productSkus = pgTable('product_skus', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  skuCode: varchar('sku_code', { length: 32 }).notNull(),
  skuName: varchar('sku_name', { length: 100 }).notNull(),
  imageUrl: varchar('image_url', { length: 500 }),
  originalImage: varchar('original_image', { length: 200 }),
  size: varchar('size', { length: 100 }),
  weightG: integer('weight_g'),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }),
  sellingPrice: decimal('selling_price', { precision: 10, scale: 2 }),
  stock: integer('stock').default(0),
  barcode: varchar('barcode', { length: 50 }),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── product_platforms 表（4.3节）──────────────────────────────────────────

export const productPlatforms = pgTable('product_platforms', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  platform: varchar('platform', { length: 20 }).notNull(),
  platformTitle: varchar('platform_title', { length: 300 }),
  platformCategory: varchar('platform_category', { length: 100 }),
  platformPrice: decimal('platform_price', { precision: 10, scale: 2 }),
  platformAttributes: jsonb('platform_attributes'),
  exportStatus: varchar('export_status', { length: 20 }).default('draft'),
  lastExportedAt: timestamp('last_exported_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  productPlatformUnique: uniqueIndex('product_platform_unique').on(table.productId, table.platform),
}))

// ── sync_logs 表（4.4节）──────────────────────────────────────────────────

export const syncLogs = pgTable('sync_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
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

// ── export_records 表（4.5节）─────────────────────────────────────────────

export const exportRecords = pgTable('export_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  platform: varchar('platform', { length: 20 }).notNull(),
  productIds: uuid('product_ids').array().notNull(),
  fileName: varchar('file_name', { length: 200 }),
  fileUrl: varchar('file_url', { length: 500 }),
  exportedBy: varchar('exported_by', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── distributors 表（4.6节）───────────────────────────────────────────────

export const distributors = pgTable('distributors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  contact: varchar('contact', { length: 100 }),
  apiToken: varchar('api_token', { length: 100 }).notNull().unique(),
  allowedCategories: text('allowed_categories').array(),
  priceType: varchar('price_type', { length: 20 }).default('selling'),
  priceMarkup: decimal('price_markup', { precision: 5, scale: 2 }).default('0'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
