/** repositories/product-skus.repository.ts — SKU 数据访问层 (纯数据库操作，不含业务逻辑) */

import { eq, and, asc, count } from 'drizzle-orm'
import { db, schema } from '../shared/db'
import type { ProductSkuRow, ProductSkuInsert } from '../shared/types'

const { productSkus } = schema

export class ProductSkusRepository {
  /** 通过产品 spuCode 查找所有 SKU */
  async findBySpuCode(spuCode: string): Promise<ProductSkuRow[]> {
    return db
      .select()
      .from(productSkus)
      .where(eq(productSkus.spuCode, spuCode))
      .orderBy(asc(productSkus.sortOrder))
  }

  /** 通过 SKU id 查找 */
  async findById(id: string): Promise<ProductSkuRow | null> {
    const [row] = await db
      .select()
      .from(productSkus)
      .where(eq(productSkus.id, id))
      .limit(1)

    return row ?? null
  }

  /** 通过 skuCode 查找 */
  async findBySkuCode(skuCode: string): Promise<ProductSkuRow | null> {
    const [row] = await db
      .select()
      .from(productSkus)
      .where(eq(productSkus.skuCode, skuCode))
      .limit(1)

    return row ?? null
  }

  /** 验证 SKU 属于指定产品 */
  async findByProductAndId(spuCode: string, skuId: string): Promise<ProductSkuRow | null> {
    const [row] = await db
      .select()
      .from(productSkus)
      .where(
        and(
          eq(productSkus.spuCode, spuCode),
          eq(productSkus.id, skuId),
        ),
      )
      .limit(1)

    return row ?? null
  }

  /** 统计某产品的 SKU 数量 */
  async countBySpuCode(spuCode: string): Promise<number> {
    const [row] = await db
      .select({ count: count() })
      .from(productSkus)
      .where(eq(productSkus.spuCode, spuCode))

    return row?.count ?? 0
  }

  /** 批量统计多产品的 SKU 数量 */
  async countMapBySpuCodes(spuCodes: string[]): Promise<Record<string, number>> {
    if (spuCodes.length === 0) return {}

    const rows = await db
      .select({
        spuCode: productSkus.spuCode,
        count: count(),
      })
      .from(productSkus)
      .groupBy(productSkus.spuCode)

    const result: Record<string, number> = {}
    for (const row of rows) {
      if (row.spuCode) {
        result[row.spuCode] = row.count
      }
    }
    return result
  }

  /** 创建 SKU */
  async create(data: ProductSkuInsert): Promise<ProductSkuRow> {
    const [row] = await db
      .insert(productSkus)
      .values(data)
      .returning()

    return row
  }

  /** 批量创建 SKU */
  async createMany(data: ProductSkuInsert[]): Promise<ProductSkuRow[]> {
    return db
      .insert(productSkus)
      .values(data)
      .returning()
  }

  /** 更新 SKU */
  async update(id: string, data: Partial<ProductSkuInsert>): Promise<ProductSkuRow | null> {
    const [row] = await db
      .update(productSkus)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(productSkus.id, id))
      .returning()

    return row ?? null
  }

  /** 通过 skuCode 更新 (upsert 辅助) */
  async upsertBySkuCode(spuCode: string, data: ProductSkuInsert): Promise<ProductSkuRow> {
    const existing = await this.findBySkuCode(data.skuCode)

    if (existing) {
      const [row] = await db
        .update(productSkus)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(productSkus.id, existing.id))
        .returning()
      return row
    }

    const [row] = await db
      .insert(productSkus)
      .values({ ...data, spuCode })
      .returning()
    return row
  }

  /** 删除 SKU */
  async delete(id: string): Promise<void> {
    await db
      .delete(productSkus)
      .where(eq(productSkus.id, id))
  }

  /** 删除某产品下所有 SKU */
  async deleteBySpuCode(spuCode: string): Promise<void> {
    await db
      .delete(productSkus)
      .where(eq(productSkus.spuCode, spuCode))
  }
}

export const productSkusRepository = new ProductSkusRepository()
