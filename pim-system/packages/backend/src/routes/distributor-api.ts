/** packages/backend/src/routes/distributor-api.ts — 分销商专用只读产品 API */

import { Hono } from 'hono'
import type { Context } from 'hono'
import { eq, asc } from 'drizzle-orm'
import { db } from '../db'
import { products, productSkus, distributors } from '../db/schema'
import { distributorAuth } from '../middleware/distributor-auth'
import { calculateSkuPrice, isCategoryAllowed } from '../services/distributor/pricing'

type DistributorRow = typeof distributors.$inferSelect

const distributorApp = new Hono<{ Variables: { distributor: DistributorRow } }>()

// 所有路由都需要 token 鉴权
distributorApp.use('/*', distributorAuth)

// ── GET /api/v1/distributor/products ─────────────────────────────────────

distributorApp.get('/products', async (c) => {
  try {
    const dist = c.get('distributor')

    // 只返回 status=active 的产品
    const rows = await db
      .select()
      .from(products)
      .where(eq(products.status, 'active'))
      .orderBy(products.r2SyncedAt)

    // allowedCategories 过滤
    const filtered = rows.filter((prod) =>
      isCategoryAllowed(prod.category, dist.allowedCategories),
    )

    const result = []
    for (const prod of filtered) {
      const skus = await db
        .select()
        .from(productSkus)
        .where(eq(productSkus.productId, prod.id))
        .orderBy(asc(productSkus.sortOrder))

      result.push({
        id: prod.id,
        productNo: prod.productNo,
        title: prod.title,
        category: prod.category,
        description: prod.description,
        folderName: prod.folderName,
        mainImageUrl: prod.mainImageUrl,
        imagesJson: prod.imagesJson,
        outerPackagingJson: prod.outerPackagingJson,
        status: prod.status,
        r2SyncedAt: prod.r2SyncedAt?.toISOString() ?? null,
        createdAt: prod.createdAt.toISOString(),
        updatedAt: prod.updatedAt.toISOString(),
        skus: skus.map((sku) => ({
          id: sku.id,
          skuCode: sku.skuCode,
          skuName: sku.skuName,
          imageUrl: sku.imageUrl,
          size: sku.size,
          weightG: sku.weightG,
          price: calculateSkuPrice(sku, dist),
          stock: sku.stock,
          sortOrder: sku.sortOrder,
        })),
      })
    }

    return c.json({ data: result })
  } catch (error) {
    console.error('获取分销产品列表失败:', error)
    return c.json({ data: null, error: '获取产品列表失败' }, 500)
  }
})

// ── GET /api/v1/distributor/products/:productNo ──────────────────────────

distributorApp.get('/products/:productNo', async (c) => {
  try {
    const productNo = c.req.param('productNo')
    const dist = c.get('distributor')

    const [prod] = await db
      .select()
      .from(products)
      .where(eq(products.productNo, productNo))
      .limit(1)

    if (!prod) {
      return c.json({ data: null, error: '产品不存在' }, 404)
    }

    // 类目过滤
    if (!isCategoryAllowed(prod.category, dist.allowedCategories)) {
      return c.json({ data: null, error: '产品不存在' }, 404)
    }

    const skus = await db
      .select()
      .from(productSkus)
      .where(eq(productSkus.productId, prod.id))
      .orderBy(asc(productSkus.sortOrder))

    const result = {
      id: prod.id,
      productNo: prod.productNo,
      title: prod.title,
      shortTitle: prod.shortTitle,
      category: prod.category,
      description: prod.description,
      folderName: prod.folderName,
      mainImageUrl: prod.mainImageUrl,
      imagesJson: prod.imagesJson,
      outerPackagingJson: prod.outerPackagingJson,
      status: prod.status,
      r2SyncedAt: prod.r2SyncedAt?.toISOString() ?? null,
      createdAt: prod.createdAt.toISOString(),
      updatedAt: prod.updatedAt.toISOString(),
      skus: skus.map((sku) => ({
        id: sku.id,
        skuCode: sku.skuCode,
        skuName: sku.skuName,
        imageUrl: sku.imageUrl,
        size: sku.size,
        weightG: sku.weightG,
        price: calculateSkuPrice(sku, dist),
        stock: sku.stock,
        sortOrder: sku.sortOrder,
      })),
    }

    return c.json({ data: result })
  } catch (error) {
    console.error('获取分销产品详情失败:', error)
    return c.json({ data: null, error: '获取产品详情失败' }, 500)
  }
})

export { distributorApp as distributorApiRoutes }
