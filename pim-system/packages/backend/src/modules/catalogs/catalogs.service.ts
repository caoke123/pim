/** modules/catalogs/catalogs.service.ts — 图册业务逻辑层 */

import { eq, ne, desc, count, inArray, asc, sql } from 'drizzle-orm'
import { db, schema } from '../../shared/db'
import { NotFoundError, ErrorCode, BusinessError } from '../../shared/utils/errors'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import type { CatalogRow } from '../../shared/types/db'
import type { ProductRow } from '../../shared/types/db'
import type { ImagesJson } from '../../shared/types'

const { catalogs, products, productSkus } = schema

export interface CatalogListItem {
  id: string
  name: string
  description: string | null
  coverImageUrl: string | null
  status: string
  productCount: number
  publicUrl: string | null
  viewCount: number
  lastViewedAt: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CatalogProductBrief {
  id: string
  spuCode: string
  title: string
  category: string | null
  mainImageUrl: string | null
  imagesJson: unknown
}

export interface CatalogDetail extends CatalogListItem {
  products: CatalogProductBrief[]
}

export interface CreateCatalogDTO {
  name: string
  description?: string
  productIds?: string[]
}

export interface UpdateCatalogDTO {
  name?: string
  description?: string
  productIds?: string[]
  coverImageUrl?: string
}

export class CatalogsService {
  /** 获取图册分页列表 */
  async getList(page: number, pageSize: number): Promise<{
    items: CatalogListItem[]
    total: number
    page: number
    pageSize: number
  }> {
    const [countResult] = await db
      .select({ count: count() })
      .from(catalogs)
      .where(ne(catalogs.status, 'deleted'))

    const total = countResult?.count ?? 0

    const rows = await db
      .select()
      .from(catalogs)
      .where(ne(catalogs.status, 'deleted'))
      .orderBy(desc(catalogs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    const items: CatalogListItem[] = rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      coverImageUrl: row.coverImageUrl,
      status: row.status,
      productCount: (row.productIds || []).length,
      publicUrl: row.publicUrl,
      viewCount: row.viewCount ?? 0,
      lastViewedAt: row.lastViewedAt instanceof Date ? row.lastViewedAt.toISOString() : (row.lastViewedAt ? String(row.lastViewedAt) : null),
      publishedAt: row.publishedAt instanceof Date ? row.publishedAt.toISOString() : (row.publishedAt ? String(row.publishedAt) : null),
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    }))

    return { items, total, page, pageSize }
  }

  /** 获取单个图册详情 (含关联产品, 保留 productIds 数组顺序) */
  async getById(id: string): Promise<CatalogDetail | null> {
    const [catalog] = await db
      .select()
      .from(catalogs)
      .where(eq(catalogs.id, id))
      .limit(1)

    if (!catalog) return null

    const productIds = (catalog.productIds || []).filter(Boolean)

    let catalogProducts: CatalogProductBrief[] = []
    if (productIds.length > 0) {
      const productRows = await db
        .select({
          id: products.id,
          spuCode: products.spuCode,
          title: products.title,
          category: products.category,
          mainImageUrl: products.mainImageUrl,
          imagesJson: products.imagesJson,
        })
        .from(products)
        .where(inArray(products.id, productIds))

      const byId = new Map(productRows.map(p => [p.id, p]))
      catalogProducts = productIds
        .map(id => byId.get(id))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
        .map(p => ({
          id: p.id,
          spuCode: p.spuCode,
          title: p.title,
          category: p.category,
          mainImageUrl: p.mainImageUrl,
          imagesJson: p.imagesJson,
        }))
    }

    return {
      id: catalog.id,
      name: catalog.name,
      description: catalog.description ?? null,
      coverImageUrl: catalog.coverImageUrl,
      status: catalog.status,
      productCount: productIds.length,
      publicUrl: catalog.publicUrl,
      viewCount: catalog.viewCount ?? 0,
      lastViewedAt: catalog.lastViewedAt instanceof Date ? catalog.lastViewedAt.toISOString() : (catalog.lastViewedAt ? String(catalog.lastViewedAt) : null),
      publishedAt: catalog.publishedAt instanceof Date ? catalog.publishedAt.toISOString() : (catalog.publishedAt ? String(catalog.publishedAt) : null),
      createdAt: catalog.createdAt instanceof Date ? catalog.createdAt.toISOString() : String(catalog.createdAt),
      updatedAt: catalog.updatedAt instanceof Date ? catalog.updatedAt.toISOString() : String(catalog.updatedAt),
      products: catalogProducts,
    }
  }

  /** 创建图册 */
  async create(dto: CreateCatalogDTO): Promise<CatalogRow> {
    if (!dto.name || !dto.name.trim()) {
      throw new BusinessError(ErrorCode.VALIDATION, '图册名称不能为空')
    }

    const productIds = dto.productIds || []

    // 验证 productIds 中的产品都存在
    if (productIds.length > 0) {
      const existingProducts = await db
        .select({ id: products.id })
        .from(products)
        .where(inArray(products.id, productIds))

      const existingIds = new Set(existingProducts.map(p => p.id))
      const missingIds = productIds.filter(id => !existingIds.has(id))

      if (missingIds.length > 0) {
        throw new BusinessError(
          ErrorCode.VALIDATION,
          `以下产品不存在: ${missingIds.join(', ')}`,
        )
      }
    }

    const [catalog] = await db
      .insert(catalogs)
      .values({
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        productIds,
        status: 'draft',
        operator: 'XP',
      })
      .returning()

    return catalog
  }

  /** 更新图册 (部分字段) */
  async update(id: string, dto: UpdateCatalogDTO): Promise<CatalogRow | null> {
    const [existing] = await db
      .select()
      .from(catalogs)
      .where(eq(catalogs.id, id))
      .limit(1)

    if (!existing) return null

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (dto.name !== undefined) {
      updateData.name = dto.name.trim()
    }

    if (dto.productIds !== undefined) {
      // 验证产品存在
      if (dto.productIds.length > 0) {
        const existingProducts = await db
          .select({ id: products.id })
          .from(products)
          .where(inArray(products.id, dto.productIds))

        const existingIds = new Set(existingProducts.map(p => p.id))
        const missingIds = dto.productIds.filter(id => !existingIds.has(id))

        if (missingIds.length > 0) {
          throw new BusinessError(
            ErrorCode.VALIDATION,
            `以下产品不存在: ${missingIds.join(', ')}`,
          )
        }
      }
      updateData.productIds = dto.productIds
    }

    if (dto.coverImageUrl !== undefined) {
      updateData.coverImageUrl = dto.coverImageUrl
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description?.trim() || null
    }

    const [updated] = await db
      .update(catalogs)
      .set(updateData)
      .where(eq(catalogs.id, id))
      .returning()

    return updated ?? null
  }

  /** 图册统计 */
  async getStats(): Promise<{
    totalCatalogs: number
    totalProducts: number
    totalImages: number
    publishedCount: number
    publishedRatio: number
  }> {
    const statsResult = await db.execute(sql`
      SELECT
        COUNT(*)::int AS "totalCatalogs",
        COALESCE(SUM(array_length(c.product_ids, 1)), 0)::int AS "totalProducts",
        COUNT(*) FILTER (WHERE c.status = 'published')::int AS "publishedCount"
      FROM catalogs c
      WHERE c.status != 'deleted'
    `)
    const row = (statsResult as any).rows?.[0] ?? {}

    const totalCatalogs = Number(row?.totalCatalogs ?? 0)
    const totalProducts = Number(row?.totalProducts ?? 0)
    const publishedCount = Number(row?.publishedCount ?? 0)

    // Count images from products in catalogs
    let totalImages = 0
    if (totalProducts > 0) {
      const imgResult = await db.execute(sql`
        SELECT COALESCE(SUM(
          COALESCE(jsonb_array_length(p.images_json->'main'), 0) +
          COALESCE(jsonb_array_length(p.images_json->'detail'), 0) +
          COALESCE(jsonb_array_length(p.images_json->'sku'), 0)
        ), 0)::int AS "totalImages"
        FROM products p
        WHERE p.is_deleted = false
        AND p.id = ANY(
          SELECT unnest(c.product_ids) FROM catalogs c WHERE c.status != 'deleted'
        )
      `)
      const imgRow = (imgResult as any).rows?.[0] ?? {}
      totalImages = Number(imgRow?.totalImages ?? 0)
    }

    return {
      totalCatalogs,
      totalProducts,
      totalImages,
      publishedCount,
      publishedRatio: totalCatalogs > 0 ? Math.round((publishedCount / totalCatalogs) * 100) : 0,
    }
  }

  /** 软删除图册 */
  async softDelete(id: string): Promise<CatalogRow | null> {
    const [existing] = await db
      .select()
      .from(catalogs)
      .where(eq(catalogs.id, id))
      .limit(1)

    if (!existing) return null

    const [updated] = await db
      .update(catalogs)
      .set({
        status: 'deleted',
        publicUrl: null,
        updatedAt: new Date(),
      })
      .where(eq(catalogs.id, id))
      .returning()

    return updated ?? null
  }

  /** 发布图册到 R2 */
  async publishCatalog(id: string): Promise<{
    publicUrl: string
    productCount: number
  }> {
    // 第一步: 读取图册
    const [catalog] = await db
      .select()
      .from(catalogs)
      .where(eq(catalogs.id, id))
      .limit(1)

    if (!catalog) {
      throw new NotFoundError(ErrorCode.NOT_FOUND, '图册不存在')
    }

    const productIds = (catalog.productIds || []).filter(Boolean)
    if (productIds.length === 0) {
      throw new BusinessError(ErrorCode.VALIDATION, '图册中没有关联产品，无法发布')
    }

    // 第二步: 读取关联产品
    const productRows = await db
      .select({
        id: products.id,
        spuCode: products.spuCode,
        title: products.title,
        category: products.category,
        mainImageUrl: products.mainImageUrl,
        imagesJson: products.imagesJson,
        r2BasePath: products.r2BasePath,
      })
      .from(products)
      .where(inArray(products.id, productIds))

    if (productRows.length === 0) {
      throw new BusinessError(ErrorCode.NOT_FOUND, '关联的产品不存在')
    }

    // 读取所有产品的 SKU
    const spuCodes = productRows.map(p => p.spuCode).filter(Boolean)
    const skuRows = await db
      .select({
        spuCode: productSkus.spuCode,
        skuCode: productSkus.skuCode,
        nameZh: productSkus.nameZh,
        nameEn: productSkus.nameEn,
        imageUrl: productSkus.imageUrl,
        sortOrder: productSkus.sortOrder,
      })
      .from(productSkus)
      .where(inArray(productSkus.spuCode, spuCodes))
      .orderBy(asc(productSkus.spuCode), asc(productSkus.sortOrder))

    // 按 spuCode 分组 SKU
    const skusBySpuCode: Record<string, typeof skuRows> = {}
    for (const sku of skuRows) {
      if (!skusBySpuCode[sku.spuCode]) {
        skusBySpuCode[sku.spuCode] = []
      }
      skusBySpuCode[sku.spuCode].push(sku)
    }

    // 第三步: 组装 JSON
    const catalogJson = {
      id: catalog.id,
      name: catalog.name,
      brand: '雨图饰品',
      createdAt: catalog.createdAt instanceof Date ? catalog.createdAt.toISOString() : String(catalog.createdAt),
      coverImageUrl: catalog.coverImageUrl ?? '',
      products: productRows.map(product => {
        const imagesJson = product.imagesJson as ImagesJson | null

        const mainImages = (imagesJson?.main ?? []).map((img, idx) => ({
          index: idx,
          url: img.r2Url || product.mainImageUrl || '',
          fileName: img.fileName ?? '',
        })).filter(img => img.url !== '')

        const productSkusList = skusBySpuCode[product.spuCode] ?? []

        return {
          spuCode: product.spuCode,
          title: product.title,
          category: product.category ?? '',
          mainImageUrl: mainImages[0]?.url ?? product.mainImageUrl ?? '',
          images: { main: mainImages },
          skus: productSkusList.map(sku => ({
            skuCode: sku.skuCode,
            nameZh: sku.nameZh,
            nameEn: sku.nameEn ?? '',
            imageUrl: sku.imageUrl ?? '',
          })),
        }
      }),
    }

    const jsonBody = JSON.stringify(catalogJson, null, 2)
    const r2Key = `catalogs/${catalog.id}.json`

    // 第四步: 上传到 R2
    const r2Endpoint = process.env.R2_ENDPOINT
    const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID
    const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    const r2Bucket = process.env.R2_BUCKET
    const r2CustomDomain = process.env.R2_CUSTOM_DOMAIN || process.env.R2_ENDPOINT

    if (!r2Endpoint || !r2AccessKeyId || !r2SecretAccessKey || !r2Bucket) {
      throw new Error('R2 环境变量未配置')
    }

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    })

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: r2Bucket,
          Key: r2Key,
          Body: jsonBody,
          ContentType: 'application/json',
        }),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`R2 上传失败: ${message}`)
    }

    // 构造公开 URL
    const publicUrl = `${r2CustomDomain}/${r2Key}`

    // 更新数据库
    await db
      .update(catalogs)
      .set({
        status: 'published',
        r2Path: r2Key,
        publicUrl,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(catalogs.id, id))

    return {
      publicUrl,
      productCount: productRows.length,
    }
  }

  /** 跟踪图册访问 (递增 viewCount, 更新 lastViewedAt) */
  async trackView(id: string): Promise<{ viewCount: number } | null> {
    const [existing] = await db
      .select({ id: catalogs.id })
      .from(catalogs)
      .where(eq(catalogs.id, id))
      .limit(1)
    if (!existing) return null

    const [updated] = await db
      .update(catalogs)
      .set({
        viewCount: sql`${catalogs.viewCount} + 1`,
        lastViewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(catalogs.id, id))
      .returning({ viewCount: catalogs.viewCount })

    return { viewCount: updated?.viewCount ?? 0 }
  }

  /** 上传图册封面 (dataURL -> R2) */
  async uploadCover(id: string, dataUrl: string): Promise<{ coverImageUrl: string } | null> {
    const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i)
    if (!match) {
      throw new BusinessError(ErrorCode.VALIDATION, '仅支持 jpg / png / webp 格式')
    }
    const mime = match[1].toLowerCase()
    const ext = mime.includes('jpeg') ? 'jpg' : mime.includes('png') ? 'png' : 'webp'
    const base64 = match[2]
    const buffer = Buffer.from(base64, 'base64')

    if (buffer.byteLength === 0) {
      throw new BusinessError(ErrorCode.VALIDATION, '图片数据为空')
    }
    if (buffer.byteLength > 10 * 1024 * 1024) {
      throw new BusinessError(ErrorCode.VALIDATION, '图片大小不能超过 10MB')
    }

    const [existing] = await db
      .select({ id: catalogs.id })
      .from(catalogs)
      .where(eq(catalogs.id, id))
      .limit(1)
    if (!existing) return null

    const r2Key = `catalogs/${id}/cover-${Date.now()}.${ext}`
    const r2Bucket = process.env.R2_BUCKET
    const r2Endpoint = process.env.R2_ENDPOINT
    const r2CustomDomain = process.env.R2_CUSTOM_DOMAIN
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

    if (!r2Bucket || !r2Endpoint || !accessKeyId || !secretAccessKey) {
      throw new BusinessError(ErrorCode.INTERNAL, 'R2 配置缺失')
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: r2Endpoint,
      credentials: { accessKeyId, secretAccessKey },
    })
    await client.send(new PutObjectCommand({
      Bucket: r2Bucket,
      Key: r2Key,
      Body: buffer,
      ContentType: mime,
    }))

    const coverImageUrl = r2CustomDomain
      ? `${r2CustomDomain.replace(/\/$/, '')}/${r2Key}`
      : `${r2Endpoint.replace(/\/$/, '')}/${r2Bucket}/${r2Key}`

    await db
      .update(catalogs)
      .set({
        coverImageUrl,
        coverImageKey: r2Key,
        updatedAt: new Date(),
      })
      .where(eq(catalogs.id, id))

    return { coverImageUrl }
  }
}

export const catalogsService = new CatalogsService()
