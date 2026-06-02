/** modules/distributions/distributions.service.ts — 分销管理业务逻辑 */

import { eq, and, sql, desc, count, asc, inArray } from 'drizzle-orm'
import { db, schema } from '../../shared/db'
import { NotFoundError, BusinessError, ErrorCode } from '../../shared/utils/errors'
import type { DistributionRow, DistributionSkuPriceRow } from '../../shared/types/db'

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
  operator: string | null
  createdAt: string
  updatedAt: string
  skus: DistributionSkuItem[]
}

export interface CreateDistributionDTO {
  customerId: string
  catalogId: string
  agreement?: string
}

export interface UpdateDistributionDTO {
  agreement?: string
  status?: 'active' | 'inactive'
  customerId?: string
  catalogId?: string
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
      .where(eq(distributions.status, 'active'))
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
      .where(eq(distributions.status, 'active'))
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

    const publicUrl = `https://catalog.yutu.nv315.top/d/${catalog.id}`
    const [row] = await db
      .insert(distributions)
      .values({
        customerId: dto.customerId,
        catalogId: dto.catalogId,
        agreement: dto.agreement?.trim() || null,
        status: 'active',
        publicUrl,
        operator: 'XP',
      })
      .returning({ id: distributions.id })

    if (row && catalog.productIds?.length) {
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
            distributionId: row.id,
            skuId: s.skuId,
            spuCode: s.spuCode,
            customerPrice: s.sellingPrice != null ? String(s.sellingPrice) : null,
          }))
        )
      }
    }

    return { id: row?.id ?? '', publicUrl }
  }

  async update(id: string, dto: UpdateDistributionDTO): Promise<DistributionRow | null> {
    const [existing] = await db
      .select({ id: distributions.id })
      .from(distributions)
      .where(eq(distributions.id, id))
      .limit(1)
    if (!existing) return null

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (dto.agreement !== undefined) updateData.agreement = dto.agreement?.trim() || null
    if (dto.status !== undefined) updateData.status = dto.status
    if (dto.customerId !== undefined) {
      const [c] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, dto.customerId)).limit(1)
      if (!c) throw new BusinessError(ErrorCode.NOT_FOUND, '客户不存在')
      updateData.customerId = dto.customerId
    }
    if (dto.catalogId !== undefined) {
      const [c] = await db.select({ id: catalogs.id }).from(catalogs).where(eq(catalogs.id, dto.catalogId)).limit(1)
      if (!c) throw new BusinessError(ErrorCode.NOT_FOUND, '图册不存在')
      updateData.catalogId = dto.catalogId
    }

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

  async publish(id: string): Promise<{ publicUrl: string | null } | null> {
    const [row] = await db
      .select({
        id: distributions.id,
        catalogId: distributions.catalogId,
        publicUrl: distributions.publicUrl,
      })
      .from(distributions)
      .where(eq(distributions.id, id))
      .limit(1)
    if (!row) return null

    const publicUrl = row.publicUrl || `https://catalog.yutu.nv315.top/d/${row.catalogId}`
    await db
      .update(distributions)
      .set({ publicUrl, status: 'active', updatedAt: new Date() })
      .where(eq(distributions.id, id))
    return { publicUrl }
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
