/** modules/share/share.service.ts — 分销分享公开 API */

import { eq, and, inArray } from 'drizzle-orm'
import { db, schema } from '../../shared/db'

const { distributions, distributionSkuPrices, customers, catalogs, products, productSkus } = schema

export interface ShareProductItem {
  productId: string
  title: string
  mainImageUrl: string | null
  sortOrder: number
  skus: ShareSkuItem[]
}

export interface ShareSkuItem {
  skuId: string
  skuCode: string
  specs: string
  skuImageUrl: string | null
  basePrice: number | null
  customerPrice: number | null
  stock: number
}

export interface ShareDistributionResponse {
  id: string
  publicUrl: string | null
  customerName: string | null
  catalogName: string
  catalogCoverImageUrl: string | null
  agreement: string | null
  productCount: number
  products: ShareProductItem[]
}

export class ShareService {
  async getShareDistribution(id: string): Promise<ShareDistributionResponse | null> {
    const [row] = await db
      .select({
        id: distributions.id,
        publicUrl: distributions.publicUrl,
        agreement: distributions.agreement,
        showCustomerName: distributions.showCustomerName,
        customerName: customers.name,
        catalogName: catalogs.name,
        catalogCoverImageUrl: catalogs.coverImageUrl,
        catalogProductIds: catalogs.productIds,
      })
      .from(distributions)
      .leftJoin(customers, eq(customers.id, distributions.customerId))
      .leftJoin(catalogs, eq(catalogs.id, distributions.catalogId))
      .where(and(eq(distributions.id, id), eq(distributions.status, 'active')))
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
            stock: productSkus.stock,
            skuImageUrl: productSkus.imageUrl,
          })
          .from(productSkus)
          .leftJoin(products, eq(products.spuCode, productSkus.spuCode))
          .where(inArray(products.id, productIds))
      : []

    const skuIds = skuRows.map((r) => r.skuId)
    const priceRows = skuIds.length
      ? await db
          .select({
            skuId: distributionSkuPrices.skuId,
            customerPrice: distributionSkuPrices.customerPrice,
          })
          .from(distributionSkuPrices)
          .where(
            and(
              eq(distributionSkuPrices.distributionId, id),
              inArray(distributionSkuPrices.skuId, skuIds)
            )
          )
      : []
    const priceMap = new Map(priceRows.map((p) => [p.skuId, p.customerPrice]))

    const productOrder = new Map(productIds.map((pid, idx) => [pid as string, idx]))
    const productMap = new Map<string, ShareProductItem>()

    for (const s of skuRows) {
      const pid = s.productId ?? ''
      if (!productMap.has(pid)) {
        productMap.set(pid, {
          productId: pid,
          title: s.productTitle ?? '—',
          mainImageUrl: s.productMainImage ?? null,
          sortOrder: productOrder.get(pid) ?? 999,
          skus: [],
        })
      }
      const customerPriceVal = priceMap.get(s.skuId)
      productMap.get(pid)!.skus.push({
        skuId: s.skuId,
        skuCode: s.skuCode,
        specs: s.nameZhCustom || s.nameZh || s.nameEn || '',
        skuImageUrl: s.skuImageUrl ?? null,
        basePrice: s.sellingPrice != null ? Number(s.sellingPrice) : null,
        customerPrice: customerPriceVal != null ? Number(customerPriceVal) : null,
        stock: s.stock ?? 0,
      })
    }

    const productsList = [...productMap.values()].sort((a, b) => a.sortOrder - b.sortOrder)

    return {
      id: row.id,
      publicUrl: row.publicUrl ?? null,
      customerName: row.showCustomerName ? (row.customerName ?? '—') : null,
      catalogName: row.catalogName ?? '—',
      catalogCoverImageUrl: row.catalogCoverImageUrl ?? null,
      agreement: row.agreement ?? null,
      productCount: productsList.length,
      products: productsList,
    }
  }
}

export const shareService = new ShareService()
