/** modules/distributions/distributions.service.ts — 分销管理业务逻辑 */

import { eq, ne, and, sql, desc, count, asc, inArray } from 'drizzle-orm'
import { db, schema } from '../../shared/db'
import { NotFoundError, BusinessError, ErrorCode } from '../../shared/utils/errors'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import type { DistributionRow, DistributionSkuPriceRow } from '../../shared/types/db'
import type { ImagesJson } from '../../shared/types'

const { distributions, distributionSkuPrices, customers, catalogs, products, productSkus } = schema

export interface DistributionListItem {
  id: string
  customerId: string
  customerName: string
  customerNotes: string | null
  catalogId: string
  catalogName: string
  catalogCoverImageUrl: string | null
  productCount: number
  status: string
  publicUrl: string | null
  operator: string | null
  createdAt: string
  updatedAt: string
}

export interface DistributionSkuItem {
  skuId: string
  spuCode: string
  productId: string
  productTitle: string
  productImage: string | null
  skuCode: string
  specs: string
  basePrice: number | null
  customerPrice: number | null
  priceId: string | null
}

export interface DistributionDetail {
  id: string
  customerId: string
  customerName: string
  customerContactPerson: string | null
  customerPhone: string | null
  customerWechat: string | null
  customerNotes: string | null
  catalogId: string
  catalogName: string
  agreement: string | null
  status: string
  publicUrl: string | null
  showCustomerName: boolean
  operator: string | null
  createdAt: string
  updatedAt: string
  skus: DistributionSkuItem[]
}

export interface CreateDistributionDTO {
  customerId: string
  catalogId: string
  agreement?: string
  showCustomerName?: boolean
}

export interface UpdateDistributionDTO {
  agreement?: string
  status?: 'active' | 'inactive'
  showCustomerName?: boolean
}

export interface UpsertPriceDTO {
  skuId: string
  customerPrice: number | null
}

export class DistributionsService {
  async getList(page: number, pageSize: number): Promise<{
    items: DistributionListItem[]
    total: number
    page: number
    pageSize: number
  }> {
    const [countResult] = await db
      .select({ count: count() })
      .from(distributions)
      .where(ne(distributions.status, 'inactive'))
    const total = countResult?.count ?? 0

    const rows = await db
      .select({
        id: distributions.id,
        customerId: distributions.customerId,
        customerName: customers.name,
        customerNotes: customers.notes,
        catalogId: distributions.catalogId,
        catalogName: catalogs.name,
        catalogCoverImageUrl: catalogs.coverImageUrl,
        status: distributions.status,
        publicUrl: distributions.publicUrl,
        operator: distributions.operator,
        createdAt: distributions.createdAt,
        updatedAt: distributions.updatedAt,
      })
      .from(distributions)
      .leftJoin(customers, eq(customers.id, distributions.customerId))
      .leftJoin(catalogs, eq(catalogs.id, distributions.catalogId))
      .where(ne(distributions.status, 'inactive'))
      .orderBy(desc(distributions.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    const items: DistributionListItem[] = await Promise.all(
      rows.map(async (row) => {
        const productCount = row.catalogId
          ? (await db
              .select({ pid: catalogs.productIds })
              .from(catalogs)
              .where(eq(catalogs.id, row.catalogId))
              .limit(1))[0]?.pid?.length ?? 0
          : 0
        return {
          id: row.id,
          customerId: row.customerId,
          customerName: row.customerName ?? '—',
          customerNotes: row.customerNotes ?? null,
          catalogId: row.catalogId,
          catalogName: row.catalogName ?? '—',
          catalogCoverImageUrl: row.catalogCoverImageUrl ?? null,
          productCount,
          status: row.status,
          publicUrl: row.publicUrl ?? null,
          operator: row.operator ?? null,
          createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
          updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
        }
      })
    )

    return { items, total, page, pageSize }
  }

  async getById(id: string): Promise<DistributionDetail | null> {
    const [row] = await db
      .select({
        id: distributions.id,
        customerId: distributions.customerId,
        customerName: customers.name,
        customerContactPerson: customers.contactPerson,
        customerPhone: customers.phone,
        customerWechat: customers.wechat,
        customerNotes: customers.notes,
        catalogId: distributions.catalogId,
        catalogName: catalogs.name,
        catalogProductIds: catalogs.productIds,
        agreement: distributions.agreement,
        status: distributions.status,
        publicUrl: distributions.publicUrl,
        showCustomerName: distributions.showCustomerName,
        operator: distributions.operator,
        createdAt: distributions.createdAt,
        updatedAt: distributions.updatedAt,
      })
      .from(distributions)
      .leftJoin(customers, eq(customers.id, distributions.customerId))
      .leftJoin(catalogs, eq(catalogs.id, distributions.catalogId))
      .where(eq(distributions.id, id))
      .limit(1)

    if (!row) return null

    const productIds = row.catalogProductIds ?? []
    const skuRows = productIds.length
      ? await db
          .select({
            skuId: productSkus.id,
            spuCode: productSkus.spuCode,
            productId: products.id,
            productTitle: products.title,
            productMainImage: products.mainImageUrl,
            skuCode: productSkus.skuCode,
            nameZh: productSkus.nameZh,
            nameEn: productSkus.nameEn,
            nameZhCustom: productSkus.nameZhCustom,
            sellingPrice: productSkus.sellingPrice,
          })
          .from(productSkus)
          .leftJoin(products, eq(products.spuCode, productSkus.spuCode))
          .where(inArray(products.id, productIds))
      : []

    const skuIds = skuRows.map((r) => r.skuId)
    const priceRows = skuIds.length
      ? await db
          .select()
          .from(distributionSkuPrices)
          .where(
            and(
              eq(distributionSkuPrices.distributionId, id),
              inArray(distributionSkuPrices.skuId, skuIds)
            )
          )
      : []
    const priceMap = new Map(priceRows.map((p) => [p.skuId, p]))

    const productOrder = new Map(productIds.map((pid, idx) => [pid as string, idx]))
    const sortedSkus = [...skuRows].sort((a, b) => {
      const ai = a.productId ? (productOrder.get(a.productId) ?? 999) : 999
      const bi = b.productId ? (productOrder.get(b.productId) ?? 999) : 999
      if (ai !== bi) return ai - bi
      return a.skuCode.localeCompare(b.skuCode)
    })

    const skus: DistributionSkuItem[] = sortedSkus.map((s) => {
      const price = priceMap.get(s.skuId)
      const label = s.nameZhCustom || s.nameZh || s.nameEn || ''
      return {
        skuId: s.skuId,
        spuCode: s.spuCode,
        productId: s.productId ?? '',
        productTitle: s.productTitle ?? '—',
        productImage: s.productMainImage ?? null,
        skuCode: s.skuCode,
        specs: label,
        basePrice: s.sellingPrice != null ? Number(s.sellingPrice) : null,
        customerPrice: price?.customerPrice != null ? Number(price.customerPrice) : null,
        priceId: price?.id ?? null,
      }
    })

    return {
      id: row.id,
      customerId: row.customerId,
      customerName: row.customerName ?? '—',
      customerContactPerson: row.customerContactPerson ?? null,
      customerPhone: row.customerPhone ?? null,
      customerWechat: row.customerWechat ?? null,
      customerNotes: row.customerNotes ?? null,
      catalogId: row.catalogId,
      catalogName: row.catalogName ?? '—',
      agreement: row.agreement ?? null,
      status: row.status,
      publicUrl: row.publicUrl ?? null,
      showCustomerName: row.showCustomerName ?? false,
      operator: row.operator ?? null,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
      skus,
    }
  }

  async create(dto: CreateDistributionDTO): Promise<{ id: string; publicUrl: string | null }> {
    const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, dto.customerId)).limit(1)
    if (!customer) throw new BusinessError(ErrorCode.NOT_FOUND, '客户不存在')

    const [catalog] = await db
      .select({ id: catalogs.id, productIds: catalogs.productIds })
      .from(catalogs)
      .where(eq(catalogs.id, dto.catalogId))
      .limit(1)
    if (!catalog) throw new BusinessError(ErrorCode.NOT_FOUND, '图册不存在')

    const [row] = await db
      .insert(distributions)
      .values({
        customerId: dto.customerId,
        catalogId: dto.catalogId,
        agreement: dto.agreement?.trim() || null,
        showCustomerName: dto.showCustomerName ?? false,
        status: 'active',
        operator: 'XP',
      })
      .returning({ id: distributions.id })

    const distributionId = row?.id ?? ''
    const publicUrl: string | null = null

    if (distributionId && catalog.productIds?.length) {
      const skuRows = await db
        .select({
          skuId: productSkus.id,
          spuCode: productSkus.spuCode,
          sellingPrice: productSkus.sellingPrice,
        })
        .from(productSkus)
        .innerJoin(products, eq(products.spuCode, productSkus.spuCode))
        .where(inArray(products.id, catalog.productIds))

      if (skuRows.length) {
        await db.insert(distributionSkuPrices).values(
          skuRows.map((s) => ({
            distributionId,
            skuId: s.skuId,
            spuCode: s.spuCode,
            customerPrice: s.sellingPrice != null ? String(s.sellingPrice) : null,
          }))
        )
      }
    }

    return { id: distributionId, publicUrl }
  }

  async update(id: string, dto: UpdateDistributionDTO): Promise<DistributionRow | null> {
    const [existing] = await db
      .select({ id: distributions.id })
      .from(distributions)
      .where(eq(distributions.id, id))
      .limit(1)
    if (!existing) return null

    const updateData: Record<string, unknown> = {}
    let hasChanges = false

    if (dto.agreement !== undefined) {
      updateData.agreement = dto.agreement?.trim() || null
      hasChanges = true
    }
    if (dto.status !== undefined) {
      updateData.status = dto.status
      hasChanges = true
    }
    if (dto.showCustomerName !== undefined) {
      updateData.showCustomerName = dto.showCustomerName
      hasChanges = true
    }

    if (!hasChanges) {
      return existing as DistributionRow
    }

    updateData.updatedAt = new Date()
    const [row] = await db
      .update(distributions)
      .set(updateData)
      .where(eq(distributions.id, id))
      .returning()
    return row ?? null
  }

  async softDelete(id: string): Promise<boolean> {
    const [existing] = await db
      .select({ id: distributions.id })
      .from(distributions)
      .where(eq(distributions.id, id))
      .limit(1)
    if (!existing) return false
    await db
      .update(distributions)
      .set({ status: 'inactive', updatedAt: new Date() })
      .where(eq(distributions.id, id))
    return true
  }

  async publishDistribution(id: string): Promise<{ publicUrl: string; productCount: number; distributorName: string }> {
    // Q1: distribution + customer + catalog
    const [dist] = await db
      .select({
        id: distributions.id,
        agreement: distributions.agreement,
        status: distributions.status,
        customerName: customers.name,
        customerContactPerson: customers.contactPerson,
        catalogName: catalogs.name,
        catalogCoverImageUrl: catalogs.coverImageUrl,
        catalogProductIds: catalogs.productIds,
      })
      .from(distributions)
      .leftJoin(customers, eq(customers.id, distributions.customerId))
      .leftJoin(catalogs, eq(catalogs.id, distributions.catalogId))
      .where(eq(distributions.id, id))
      .limit(1)

    if (!dist) throw new NotFoundError(ErrorCode.NOT_FOUND, '分销记录不存在')

    const productIds = (dist.catalogProductIds || []).filter(Boolean)
    if (productIds.length === 0) {
      throw new BusinessError(ErrorCode.VALIDATION, '关联图册没有产品，无法发布')
    }

    // Q2: products
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

    if (productRows.length === 0) {
      throw new BusinessError(ErrorCode.NOT_FOUND, '关联的产品不存在')
    }

    // Q3: SKUs (with id for priceMap matching)
    const spuCodes = productRows.map(p => p.spuCode).filter(Boolean)
    const skuRows = await db
      .select({
        id: productSkus.id,
        spuCode: productSkus.spuCode,
        skuCode: productSkus.skuCode,
        nameZh: productSkus.nameZh,
        nameEn: productSkus.nameEn,
        imageUrl: productSkus.imageUrl,
        sellingPrice: productSkus.sellingPrice,
        sortOrder: productSkus.sortOrder,
      })
      .from(productSkus)
      .where(inArray(productSkus.spuCode, spuCodes))
      .orderBy(asc(productSkus.spuCode), asc(productSkus.sortOrder))

    const skusBySpuCode: Record<string, typeof skuRows> = {}
    for (const sku of skuRows) {
      if (!skusBySpuCode[sku.spuCode]) skusBySpuCode[sku.spuCode] = []
      skusBySpuCode[sku.spuCode].push(sku)
    }

    // Q4: customer pricing
    const priceRows = await db
      .select({
        skuId: distributionSkuPrices.skuId,
        customerPrice: distributionSkuPrices.customerPrice,
      })
      .from(distributionSkuPrices)
      .where(eq(distributionSkuPrices.distributionId, id))

    const priceMap = new Map(priceRows.map(p => [p.skuId, p.customerPrice]))

    // Assemble JSON
    const catalogJson = {
      id,
      name: dist.catalogName ?? '',
      brand: '雨图饰品',
      createdAt: new Date().toISOString(),
      coverImageUrl: dist.catalogCoverImageUrl ?? '',
      products: productRows
        .filter(product => (skusBySpuCode[product.spuCode] ?? []).length > 0)
        .map(product => {
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
          skus: productSkusList.map(sku => {
            const customerPriceVal = priceMap.get(sku.id)
            return {
              skuCode: sku.skuCode,
              nameZh: sku.nameZh,
              nameEn: sku.nameEn ?? '',
              imageUrl: sku.imageUrl ?? '',
              supplyPrice: customerPriceVal != null ? Number(customerPriceVal) : null,
              suggestedPrice: sku.sellingPrice != null ? Number(sku.sellingPrice) : null,
            }
          }),
        }
      }),
      distributorInfo: {
        distributorName: dist.customerName ?? '',
        cooperationLevel: '标准合作',
        currency: '¥',
        agreementText: dist.agreement ?? undefined,
        validUntil: null,
        contactManager: dist.customerContactPerson ?? undefined,
      },
    }

    const jsonBody = JSON.stringify(catalogJson, null, 2)
    const r2Key = `distributions/${id}.json`

    // Upload to R2
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

    const eCatalogBase = process.env.ECATALOG_BASE_URL || 'http://localhost:3010'
    const publicUrl = `${eCatalogBase}/distributions/${id}`

    // Update DB
    await db
      .update(distributions)
      .set({
        status: 'published',
        publicUrl,
        r2Path: r2Key,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(distributions.id, id))

    return {
      publicUrl,
      productCount: catalogJson.products.length,
      distributorName: dist.customerName ?? '',
    }
  }

  async upsertPrices(distributionId: string, items: UpsertPriceDTO[]): Promise<number> {
    const [dist] = await db
      .select({ id: distributions.id })
      .from(distributions)
      .where(eq(distributions.id, distributionId))
      .limit(1)
    if (!dist) throw new NotFoundError(ErrorCode.NOT_FOUND, '分销记录不存在')

    const skuIds = items.map((i) => i.skuId)
    if (!skuIds.length) return 0
    const skuRows = await db
      .select({ id: productSkus.id, spuCode: productSkus.spuCode })
      .from(productSkus)
      .where(inArray(productSkus.id, skuIds))
    const skuMap = new Map(skuRows.map((s) => [s.id, s.spuCode]))

    let count = 0
    for (const it of items) {
      const spuCode = skuMap.get(it.skuId)
      if (!spuCode) continue
      const priceValue = it.customerPrice != null && !Number.isNaN(Number(it.customerPrice))
        ? String(it.customerPrice)
        : null
      await db
        .insert(distributionSkuPrices)
        .values({
          distributionId,
          skuId: it.skuId,
          spuCode,
          customerPrice: priceValue,
        })
        .onConflictDoUpdate({
          target: [distributionSkuPrices.distributionId, distributionSkuPrices.skuId],
          set: {
            customerPrice: priceValue,
            updatedAt: new Date(),
          },
        })
      count++
    }
    return count
  }
}

export const distributionsService = new DistributionsService()
