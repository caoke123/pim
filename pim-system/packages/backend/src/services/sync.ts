/** packages/backend/src/services/sync.ts — R2 数据同步核心逻辑 */

import { eq, and, isNull } from 'drizzle-orm'
import type { ProductJson, ProductJsonSku } from '@yuntu/shared'
import type { InferInsertModel } from 'drizzle-orm'
import { db } from '../db'
import { products, productSkus, syncLogs } from '../db/schema'
import { R2Service } from './r2'

type InsertProduct = InferInsertModel<typeof products>
type InsertProductSku = InferInsertModel<typeof productSkus>

/** 安全地将数值转为 decimal 列接受的字符串 */
function toDecimalStr(val: number | null | undefined): string | null {
  if (val === null || val === undefined) return null
  return String(val)
}

export interface SyncResult {
  totalScanned: number
  newCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
}

export class SyncService {
  constructor(private r2: R2Service) {}

  /** 执行一次完整同步，返回同步结果统计 */
  async runSync(trigger: 'auto' | 'manual', logId?: string): Promise<SyncResult> {
    const startedAt = new Date()
    let syncLogId = logId

    // 如果未提供 logId，创建新的同步日志记录
    if (!syncLogId) {
      const [log] = await db
        .insert(syncLogs)
        .values({
          trigger,
          status: 'running',
          startedAt,
        })
        .returning({ id: syncLogs.id })
      syncLogId = log.id
    }

    const result: SyncResult = {
      totalScanned: 0,
      newCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
    }

    try {
      // 1. 列举所有 product.json
      const keys = await this.r2.listProductJsonKeys()
      result.totalScanned = keys.length

      if (keys.length === 0) {
        await this.finishSyncLog(syncLogId, result, startedAt)
        return result
      }

      // 2. 批量读取（并发数 5）
      const batchResults = await this.r2.batchGetProductJson(keys, 5)

      // 3. 逐个处理
      for (const item of batchResults) {
        if (!item.data) {
          result.failedCount++
          continue
        }

        try {
          const folderName = R2Service.extractFolderName(item.key)
          const outcome = await this.syncProduct(item.data, folderName)

          switch (outcome) {
            case 'new':
              result.newCount++
              break
            case 'updated':
              result.updatedCount++
              break
            case 'skipped':
              result.skippedCount++
              break
          }
        } catch (error) {
          console.error(`同步产品失败 [${item.data.productNo}]:`, error)
          result.failedCount++
        }
      }

      await this.finishSyncLog(syncLogId, result, startedAt)
      return result
    } catch (error) {
      console.error('同步任务异常:', error)
      result.failedCount = result.totalScanned
      await this.finishSyncLog(syncLogId, result, startedAt)
      return result
    }
  }

  /** 完成同步日志记录 */
  private async finishSyncLog(
    logId: string,
    result: SyncResult,
    startedAt: Date,
  ): Promise<void> {
    await db
      .update(syncLogs)
      .set({
        status: result.failedCount > 0 && result.newCount === 0 && result.updatedCount === 0 ? 'failed' : 'done',
        totalScanned: result.totalScanned,
        newCount: result.newCount,
        updatedCount: result.updatedCount,
        skippedCount: result.skippedCount,
        failedCount: result.failedCount,
        completedAt: new Date(),
      })
      .where(eq(syncLogs.id, logId))
  }

  /** 同步单个产品（upsert products + product_skus） */
  private async syncProduct(
    data: ProductJson,
    folderName: string,
  ): Promise<'new' | 'updated' | 'skipped'> {
    const r2SyncedAt = new Date(data.r2.syncedAt)
    const pimSyncedAt = new Date()

    // 查找数据库中是否已有该 product_no 的记录
    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.productNo, data.productNo))
      .limit(1)

    // 不存在 → INSERT
    if (!existing) {
      const insertData = this.mapToProductRecord(data, folderName)
      const [newProduct] = await db
        .insert(products)
        .values({
          ...insertData,
          r2SyncedAt,
          pimSyncedAt,
        })
        .returning({ id: products.id })

      await this.upsertSkus(data.skus, newProduct.id, true)
      return 'new'
    }

    // 已有且 r2_synced_at >= data.r2.syncedAt → 跳过
    if (existing.r2SyncedAt && existing.r2SyncedAt >= r2SyncedAt) {
      return 'skipped'
    }

    // 已有但 r2_synced_at < data.r2.syncedAt → UPDATE
    const updateData = this.mapToProductRecord(data, folderName)
    await db
      .update(products)
      .set({
        title: updateData.title as string,
        category: updateData.category,
        description: updateData.description,
        mainImageUrl: updateData.mainImageUrl,
        imagesJson: updateData.imagesJson,
        r2BasePath: updateData.r2BasePath,
        r2BaseUrl: updateData.r2BaseUrl,
        outerPackagingJson: updateData.outerPackagingJson,
        toolVersion: updateData.toolVersion,
        r2SyncedAt,
        pimSyncedAt,
        // status 保护：如果已是 active 则不重置为 pending
        ...(existing.status === 'active' ? {} : { status: 'pending' as const }),
        updatedAt: new Date(),
      })
      .where(eq(products.id, existing.id))

    await this.upsertSkus(data.skus, existing.id, false)
    return 'updated'
  }

  /** upsert SKU 列表（以 skuCode 为匹配键） */
  private async upsertSkus(
    skus: ProductJsonSku[],
    productId: string,
    isNew: boolean,
  ): Promise<void> {
    for (const sku of skus) {
      const skuValues: Record<string, unknown> = {
        productId,
        skuCode: sku.skuCode,
        skuName: sku.skuName,
        imageUrl: sku.imageUrl ?? null,
        originalImage: sku.image ?? null,
        size: sku.size ?? null,
        weightG: sku.weight ?? null,
        costPrice: toDecimalStr(sku.costPrice),
        sellingPrice: toDecimalStr(sku.sellingPrice),
      }

      if (isNew) {
        await db.insert(productSkus).values(skuValues as typeof productSkus.$inferInsert)
      } else {
        const [existingSku] = await db
          .select()
          .from(productSkus)
          .where(
            and(
              eq(productSkus.productId, productId),
              eq(productSkus.skuCode, sku.skuCode),
            ),
          )
          .limit(1)

        if (existingSku) {
          // 更新不保护的字段：sku_name / image_url / original_image
          // size / weight_g / cost_price / selling_price / stock / barcode 有值则保留不覆盖
          const updateSkuValues: Record<string, unknown> = {
            skuName: sku.skuName,
            imageUrl: sku.imageUrl ?? null,
            originalImage: sku.image ?? null,
            updatedAt: new Date(),
          }

          if (existingSku.size === null) updateSkuValues.size = sku.size ?? null
          if (existingSku.weightG === null) updateSkuValues.weightG = sku.weight ?? null
          if (existingSku.costPrice === null && sku.costPrice != null) {
            updateSkuValues.costPrice = toDecimalStr(sku.costPrice)
          }
          if (existingSku.sellingPrice === null && sku.sellingPrice != null) {
            updateSkuValues.sellingPrice = toDecimalStr(sku.sellingPrice)
          }

          await db
            .update(productSkus)
            .set(updateSkuValues as typeof productSkus.$inferInsert)
            .where(eq(productSkus.id, existingSku.id))
        } else {
          await db.insert(productSkus).values(skuValues as typeof productSkus.$inferInsert)
        }
      }
    }
  }

  /** 从 ProductJson 映射到 products 表字段 */
  private mapToProductRecord(data: ProductJson, folderName: string): InsertProduct {
    const record: InsertProduct = {
      productNo: data.productNo,
      title: data.title,
      shortTitle: data.shortTitle ?? null,
      category: data.category ?? null,
      description: data.description ?? null,
      folderName,
      r2BasePath: data.r2.basePath ?? null,
      r2BaseUrl: data.r2.baseUrl ?? null,
      mainImageUrl: data.r2.images.main[0]?.url ?? null,
      imagesJson: data.r2.images as unknown as Record<string, unknown>,
      outerPackagingJson: (data.outerPackaging as unknown as Record<string, unknown>) ?? null,
      toolVersion: data.toolVersion ?? null,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    return record
  }
}
