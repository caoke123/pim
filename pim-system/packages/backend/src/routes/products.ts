/** packages/backend/src/routes/products.ts — 产品相关路由 */

import { Hono } from 'hono'
import { eq, and, or, ilike, asc, desc, sql, count } from 'drizzle-orm'
import { db } from '../db'
import { products, productSkus, productPlatforms } from '../db/schema'
import type { ApiResponse, PaginatedResponse, ProductRecord, ProductSkuRecord, ProductPlatformRecord, ProductStatus } from '@yuntu/shared'

const productsApp = new Hono()

/** 将 decimal 字段转为 number（Drizzle decimal 列在 JS 返回 string） */
function toNumber(val: string | null | undefined): number | null {
  if (val === null || val === undefined) return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

// ── GET /api/v1/products ──────────────────────────────────────────────────

productsApp.get('/', async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query('page')) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize')) || 20))
    const status = c.req.query('status') as ProductStatus | undefined
    const category = c.req.query('category')
    const search = c.req.query('search')
    const sortBy = c.req.query('sortBy') || 'r2_synced_at'
    const sortOrder = c.req.query('sortOrder') === 'asc' ? 'asc' : 'desc'

    // 白名单校验 sortBy
    const allowedSortFields = ['created_at', 'updated_at', 'r2_synced_at', 'title', 'product_no'] as const
    const safeSortBy = allowedSortFields.includes(sortBy as typeof allowedSortFields[number])
      ? sortBy
      : 'r2_synced_at'

    // 构建 where 条件
    const conditions: ReturnType<typeof eq>[] = []
    if (status) {
      conditions.push(eq(products.status, status))
    }
    if (category) {
      conditions.push(eq(products.category, category))
    }
    if (search) {
      conditions.push(
        or(
          ilike(products.title, `%${search}%`),
          ilike(products.productNo, `%${search}%`),
        )!
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // 计数查询
    const [countResult] = await db
      .select({ count: count() })
      .from(products)
      .where(whereClause)

    const total = countResult?.count ?? 0

    // 排序方向
    const orderFn = sortOrder === 'desc' ? desc : asc
    // 安全映射排序字段到表列
    const sortColumn = (() => {
      switch (safeSortBy) {
        case 'created_at': return products.createdAt
        case 'updated_at': return products.updatedAt
        case 'title': return products.title
        case 'product_no': return products.productNo
        default: return products.r2SyncedAt
      }
    })()

    // 分页查询
    const rows = await db
      .select({
        id: products.id,
        productNo: products.productNo,
        title: products.title,
        category: products.category,
        status: products.status,
        mainImageUrl: products.mainImageUrl,
        r2SyncedAt: products.r2SyncedAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    // 为每个产品查询 SKU 数量
    const productIds = rows.map((r) => r.id)
    const skuCounts: Record<string, number> = {}
    if (productIds.length > 0) {
      // 使用子查询统计 sku 数量
      for (const row of rows) {
        const [skuResult] = await db
          .select({ count: count() })
          .from(productSkus)
          .where(eq(productSkus.productId, row.id))
        skuCounts[row.id] = skuResult?.count ?? 0
      }
    }

    const items = rows.map((row) => ({
      id: row.id,
      productNo: row.productNo,
      title: row.title,
      category: row.category,
      status: row.status,
      mainImageUrl: row.mainImageUrl,
      skuCount: skuCounts[row.id] ?? 0,
      r2SyncedAt: row.r2SyncedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    }))

    const response: ApiResponse<PaginatedResponse<typeof items[number]>> = {
      data: { items, total, page, pageSize },
    }
    return c.json(response)
  } catch (error) {
    console.error('获取产品列表失败:', error)
    return c.json({ data: null, error: '获取产品列表失败' }, 500)
  }
})

// ── GET /api/v1/products/:id ──────────────────────────────────────────────

productsApp.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1)

    if (!product) {
      return c.json({ data: null, error: '产品不存在' }, 404)
    }

    // 查询 SKU 列表（按 sort_order ASC）
    const skus = await db
      .select()
      .from(productSkus)
      .where(eq(productSkus.productId, id))
      .orderBy(asc(productSkus.sortOrder))

    // 查询平台配置
    const platforms = await db
      .select()
      .from(productPlatforms)
      .where(eq(productPlatforms.productId, id))

    // 映射到 camelCase 响应
    const productDetail = {
      id: product.id,
      productNo: product.productNo,
      title: product.title,
      shortTitle: product.shortTitle,
      category: product.category,
      description: product.description,
      folderName: product.folderName,
      r2BasePath: product.r2BasePath,
      r2BaseUrl: product.r2BaseUrl,
      r2SyncedAt: product.r2SyncedAt?.toISOString() ?? null,
      pimSyncedAt: product.pimSyncedAt?.toISOString() ?? null,
      mainImageUrl: product.mainImageUrl,
      imagesJson: product.imagesJson,
      outerPackagingJson: product.outerPackagingJson,
      toolVersion: product.toolVersion,
      status: product.status as ProductStatus,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      skus: skus.map((sku) => ({
        id: sku.id,
        productId: sku.productId,
        skuCode: sku.skuCode,
        skuName: sku.skuName,
        imageUrl: sku.imageUrl,
        originalImage: sku.originalImage,
        size: sku.size,
        weightG: sku.weightG,
        costPrice: toNumber(sku.costPrice as string),
        sellingPrice: toNumber(sku.sellingPrice as string),
        stock: sku.stock,
        barcode: sku.barcode,
        sortOrder: sku.sortOrder,
        createdAt: sku.createdAt.toISOString(),
        updatedAt: sku.updatedAt.toISOString(),
      })),
      platforms: platforms.map((p) => ({
        id: p.id,
        productId: p.productId,
        platform: p.platform,
        platformTitle: p.platformTitle,
        platformCategory: p.platformCategory,
        platformPrice: toNumber(p.platformPrice as string),
        platformAttributes: p.platformAttributes,
        exportStatus: p.exportStatus,
        lastExportedAt: p.lastExportedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    }

    return c.json({ data: productDetail })
  } catch (error) {
    console.error('获取产品详情失败:', error)
    return c.json({ data: null, error: '获取产品详情失败' }, 500)
  }
})

// ── PATCH /api/v1/products/:id ────────────────────────────────────────────

productsApp.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()

    // 检查产品是否存在
    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1)

    if (!existing) {
      return c.json({ data: null, error: '产品不存在' }, 404)
    }

    // 不允许修改的字段
    const immutableFields = [
      'productNo', 'r2BasePath', 'r2BaseUrl', 'r2SyncedAt',
      'toolVersion', 'createdAt', 'id',
    ]

    // 构建允许更新的字段集合
    const allowedUpdate = new Set([
      'title', 'shortTitle', 'category', 'description', 'folderName',
      'pimSyncedAt', 'mainImageUrl', 'imagesJson', 'outerPackagingJson',
      'status',
    ])

    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body)) {
      if (immutableFields.includes(key)) continue
      if (allowedUpdate.has(key) && value !== undefined) {
        updateData[key] = value
      }
    }

    if (Object.keys(updateData).length === 0) {
      return c.json({ data: existing })
    }

    const [updated] = await db
      .update(products)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning()

    return c.json({ data: updated })
  } catch (error) {
    console.error('更新产品失败:', error)
    return c.json({ data: null, error: '更新产品失败' }, 500)
  }
})

// ── PATCH /api/v1/products/:id/skus/:skuId ────────────────────────────────

productsApp.patch('/:id/skus/:skuId', async (c) => {
  try {
    const productId = c.req.param('id')
    const skuId = c.req.param('skuId')
    const body = await c.req.json()

    const [sku] = await db
      .select()
      .from(productSkus)
      .where(and(eq(productSkus.id, skuId), eq(productSkus.productId, productId)))
      .limit(1)

    if (!sku) {
      return c.json({ data: null, error: 'SKU 不存在' }, 404)
    }

    // 只允许更新的字段
    const allowedFields = ['size', 'weightG', 'costPrice', 'sellingPrice', 'stock', 'barcode'] as const
    const updateData: Record<string, unknown> = {}

    for (const key of allowedFields) {
      if (key in body && body[key] !== undefined) {
        updateData[key] = body[key]
      }
    }

    if (Object.keys(updateData).length === 0) {
      // 映射返回
      return c.json({
        data: {
          id: sku.id,
          productId: sku.productId,
          skuCode: sku.skuCode,
          skuName: sku.skuName,
          imageUrl: sku.imageUrl,
          originalImage: sku.originalImage,
          size: sku.size,
          weightG: sku.weightG,
          costPrice: toNumber(sku.costPrice as string),
          sellingPrice: toNumber(sku.sellingPrice as string),
          stock: sku.stock,
          barcode: sku.barcode,
          sortOrder: sku.sortOrder,
          createdAt: sku.createdAt.toISOString(),
          updatedAt: sku.updatedAt.toISOString(),
        },
      })
    }

    const [updated] = await db
      .update(productSkus)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(productSkus.id, skuId))
      .returning()

    return c.json({
      data: {
        id: updated.id,
        productId: updated.productId,
        skuCode: updated.skuCode,
        skuName: updated.skuName,
        imageUrl: updated.imageUrl,
        originalImage: updated.originalImage,
        size: updated.size,
        weightG: updated.weightG,
        costPrice: toNumber(updated.costPrice as string),
        sellingPrice: toNumber(updated.sellingPrice as string),
        stock: updated.stock,
        barcode: updated.barcode,
        sortOrder: updated.sortOrder,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('更新 SKU 失败:', error)
    return c.json({ data: null, error: '更新 SKU 失败' }, 500)
  }
})

// ── GET /api/v1/products/:id/skus ─────────────────────────────────────────

productsApp.get('/:id/skus', async (c) => {
  try {
    const id = c.req.param('id')

    // 检查产品是否存在
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1)

    if (!product) {
      return c.json({ data: null, error: '产品不存在' }, 404)
    }

    const skus = await db
      .select()
      .from(productSkus)
      .where(eq(productSkus.productId, id))
      .orderBy(asc(productSkus.sortOrder))

    const mapped = skus.map((sku) => ({
      id: sku.id,
      productId: sku.productId,
      skuCode: sku.skuCode,
      skuName: sku.skuName,
      imageUrl: sku.imageUrl,
      originalImage: sku.originalImage,
      size: sku.size,
      weightG: sku.weightG,
      costPrice: toNumber(sku.costPrice as string),
      sellingPrice: toNumber(sku.sellingPrice as string),
      stock: sku.stock,
      barcode: sku.barcode,
      sortOrder: sku.sortOrder,
      createdAt: sku.createdAt.toISOString(),
      updatedAt: sku.updatedAt.toISOString(),
    }))

    return c.json({ data: mapped })
  } catch (error) {
    console.error('获取 SKU 列表失败:', error)
    return c.json({ data: null, error: '获取 SKU 列表失败' }, 500)
  }
})

// ── 平台相关路由（占位实现）────────────────────────────────────────────────

productsApp.get('/:id/platforms', async (c) => {
  try {
    const id = c.req.param('id')
    const platforms = await db
      .select()
      .from(productPlatforms)
      .where(eq(productPlatforms.productId, id))

    const mapped = platforms.map((p) => ({
      id: p.id,
      productId: p.productId,
      platform: p.platform,
      platformTitle: p.platformTitle,
      platformCategory: p.platformCategory,
      platformPrice: toNumber(p.platformPrice as string),
      platformAttributes: p.platformAttributes,
      exportStatus: p.exportStatus,
      lastExportedAt: p.lastExportedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }))

    return c.json({ data: mapped })
  } catch (error) {
    console.error('获取平台配置失败:', error)
    return c.json({ data: null, error: '获取平台配置失败' }, 500)
  }
})

productsApp.put('/:id/platforms/:platform', async (c) => {
  try {
    const productId = c.req.param('id')
    const platform = c.req.param('platform') as 'shopee' | 'temu' | 'miaoshou'
    const body = await c.req.json()

    const [existing] = await db
      .select()
      .from(productPlatforms)
      .where(
        and(
          eq(productPlatforms.productId, productId),
          eq(productPlatforms.platform, platform),
        ),
      )
      .limit(1)

    if (existing) {
      const [updated] = await db
        .update(productPlatforms)
        .set({
          platformTitle: body.platformTitle !== undefined ? body.platformTitle : existing.platformTitle,
          platformCategory: body.platformCategory !== undefined ? body.platformCategory : existing.platformCategory,
          platformPrice: body.platformPrice !== undefined ? String(body.platformPrice) : existing.platformPrice,
          platformAttributes: body.platformAttributes !== undefined ? body.platformAttributes : existing.platformAttributes,
          exportStatus: body.exportStatus || existing.exportStatus,
          updatedAt: new Date(),
        })
        .where(eq(productPlatforms.id, existing.id))
        .returning()
      return c.json({
        data: {
          id: updated.id,
          productId: updated.productId,
          platform: updated.platform,
          platformTitle: updated.platformTitle,
          platformCategory: updated.platformCategory,
          platformPrice: toNumber(updated.platformPrice as string),
          platformAttributes: updated.platformAttributes,
          exportStatus: updated.exportStatus,
          lastExportedAt: updated.lastExportedAt?.toISOString() ?? null,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      })
    } else {
      const [created] = await db
        .insert(productPlatforms)
        .values({
          productId,
          platform,
          platformTitle: body.platformTitle ?? null,
          platformCategory: body.platformCategory ?? null,
          platformPrice: body.platformPrice ?? null,
          platformAttributes: body.platformAttributes ?? null,
        })
        .returning()
      return c.json({
        data: {
          id: created.id,
          productId: created.productId,
          platform: created.platform,
          platformTitle: created.platformTitle,
          platformCategory: created.platformCategory,
          platformPrice: toNumber(created.platformPrice as string),
          platformAttributes: created.platformAttributes,
          exportStatus: created.exportStatus,
          lastExportedAt: null,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      }, 201)
    }
  } catch (error) {
    console.error('更新平台配置失败:', error)
    return c.json({ data: null, error: '更新平台配置失败' }, 500)
  }
})

productsApp.delete('/:id/platforms/:platform', async (c) => {
  try {
    const productId = c.req.param('id')
    const platform = c.req.param('platform')

    await db
      .delete(productPlatforms)
      .where(
        and(
          eq(productPlatforms.productId, productId),
          eq(productPlatforms.platform, platform),
        ),
      )

    return c.body(null, 204)
  } catch (error) {
    console.error('删除平台配置失败:', error)
    return c.json({ data: null, error: '删除平台配置失败' }, 500)
  }
})

export { productsApp as productsRoutes }
