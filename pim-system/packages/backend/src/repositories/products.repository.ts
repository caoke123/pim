/** repositories/products.repository.ts — 产品数据访问层 (纯数据库操作，不含业务逻辑) */

import { eq, like, or, and, asc, desc, count, sql } from 'drizzle-orm'
import { db, schema } from '../shared/db'
import type { ProductRow, ProductInsert, ProductListQuery } from '../shared/types'

const { products } = schema

export class ProductsRepository {
  /** 分页列表 (含搜索/筛选/排序) */
  async findMany(query: ProductListQuery): Promise<{
    items: ProductRow[]
    total: number
  }> {
    const { page = 1, pageSize = 20, search, status, category, sortBy = 'createdAt', sortOrder = 'desc' } = query

    const conditions = []

    if (status) {
      conditions.push(eq(products.status, status))
    }
    if (category) {
      conditions.push(eq(products.category, category))
    }
    if (search) {
      conditions.push(
        or(
          like(products.title, `%${search}%`),
          like(products.spuCode, `%${search}%`),
        )!
      )
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [countResult] = await db
      .select({ count: count() })
      .from(products)
      .where(where)

    const total = countResult?.count ?? 0

    const sortColumn = (() => {
      switch (sortBy) {
        case 'title': return products.title
        case 'spuCode': return products.spuCode
        case 'updatedAt': return products.updatedAt
        default: return products.createdAt
      }
    })()

    const orderFn = sortOrder === 'asc' ? asc : desc

    const rows = await db
      .select()
      .from(products)
      .where(where)
      .orderBy(orderFn(sortColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    return { items: rows, total }
  }

  /** 通过 id 查找 */
  async findById(id: string): Promise<ProductRow | null> {
    const [row] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1)

    return row ?? null
  }

  /** 通过 spuCode 查找 */
  async findBySpuCode(spuCode: string): Promise<ProductRow | null> {
    const [row] = await db
      .select()
      .from(products)
      .where(eq(products.spuCode, spuCode))
      .limit(1)

    return row ?? null
  }

  /** 创建产品 */
  async create(data: ProductInsert): Promise<ProductRow> {
    const [row] = await db
      .insert(products)
      .values(data)
      .returning()

    return row
  }

  /** 更新产品 (传入需要更新的字段) */
  async update(id: string, data: Partial<ProductInsert>): Promise<ProductRow | null> {
    const [row] = await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning()

    return row ?? null
  }

  /** 软删除 */
  async softDelete(id: string): Promise<void> {
    await db
      .update(products)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(products.id, id))
  }

  /** 按状态统计 */
  async countByStatus(): Promise<Record<string, number>> {
    const rows = await db
      .select({
        status: products.status,
        count: count(),
      })
      .from(products)
      .groupBy(products.status)

    const result: Record<string, number> = {}
    for (const row of rows) {
      result[row.status] = row.count
    }
    return result
  }

  /** 总数 */
  async count(): Promise<number> {
    const [row] = await db
      .select({ count: count() })
      .from(products)

    return row?.count ?? 0
  }
}

export const productsRepository = new ProductsRepository()
