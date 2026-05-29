/** packages/backend/src/services/export/base.ts — 通用导出基类 */

import { eq, and, inArray } from 'drizzle-orm'
import ExcelJS from 'exceljs'
import { db } from '../../db'
import { products, productSkus, productPlatforms } from '../../db/schema'
import type { Platform } from '@yuntu/shared'

export interface ExportProductData {
  productId: string
  productNo: string
  title: string
  category: string | null
  description: string | null
  mainImageUrl: string | null
  platformTitle: string | null
  platformCategory: string | null
  platformPrice: number | null
  platformAttributes: Record<string, unknown> | null
  skus: {
    id: string
    skuCode: string
    skuName: string
    imageUrl: string | null
    size: string | null
    weightG: number | null
    costPrice: number | null
    sellingPrice: number | null
    stock: number | null
    barcode: string | null
  }[]
}

export async function getExportData(
  productIds: string[],
  platform: Platform,
): Promise<ExportProductData[]> {
  // 联查 products + product_skus + product_platforms
  const prodRows = await db
    .select()
    .from(products)
    .where(inArray(products.id, productIds))

  const skuRows = await db
    .select()
    .from(productSkus)
    .where(inArray(productSkus.productId, productIds))
    .orderBy(productSkus.sortOrder)

  const platformRows = await db
    .select()
    .from(productPlatforms)
    .where(
      and(
        inArray(productPlatforms.productId, productIds),
        eq(productPlatforms.platform, platform),
      ),
    )

  const platformMap = new Map(platformRows.map((p) => [p.productId, p]))
  const skuMap = new Map<string, typeof skuRows>()
  for (const sku of skuRows) {
    const list = skuMap.get(sku.productId) || []
    list.push(sku)
    skuMap.set(sku.productId, list)
  }

  function toNum(val: string | null): number | null {
    if (val === null) return null
    const n = Number(val)
    return isNaN(n) ? null : n
  }

  return prodRows.map((prod) => {
    const pConfig = platformMap.get(prod.id)
    const skus = (skuMap.get(prod.id) || []).map((sku) => ({
      id: sku.id,
      skuCode: sku.skuCode,
      skuName: sku.skuName,
      imageUrl: sku.imageUrl,
      size: sku.size,
      weightG: sku.weightG,
      costPrice: toNum(sku.costPrice as string),
      sellingPrice: toNum(sku.sellingPrice as string),
      stock: sku.stock,
      barcode: sku.barcode,
    }))

    return {
      productId: prod.id,
      productNo: prod.productNo,
      title: prod.title,
      category: prod.category,
      description: prod.description,
      mainImageUrl: prod.mainImageUrl,
      platformTitle: pConfig?.platformTitle ?? null,
      platformCategory: pConfig?.platformCategory ?? null,
      platformPrice: toNum(pConfig?.platformPrice as string),
      platformAttributes: pConfig?.platformAttributes as Record<string, unknown> | null,
      skus,
    }
  })
}

/** 通用 Excel 样式辅助 */
export function applyDefaultStyles(worksheet: ExcelJS.Worksheet, columnCount: number) {
  worksheet.columns.forEach((col, i) => {
    col.width = Math.max(12, Math.min(50, (col.width || 15) + 4))
  })
}
