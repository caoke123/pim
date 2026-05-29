/** packages/shared/types/platform.ts — 各平台导出字段映射与请求类型 */

// ── 各平台导出行定义（对应文档第8章字段映射）─────────────────────────────

export interface ShopeeExportRow {
  商品名称: string
  商品描述: string
  类目路径: string
  卖家货号: string
  规格SKU: string
  规格名称: string
  重量g: number | null
  售价: number | null
  库存: number | null
  主图URL: string | null
}

export interface TemuExportRow {
  'Product Name': string
  Description: string
  Category: string
  'Seller SKU': string
  'Variant SKU': string
  'Variant Name': string
  'Weight(g)': number | null
  Price: number | null
  Stock: number | null
  'Main Image': string | null
}

export interface MiaoshouExportRow {
  产品标题: string
  详情描述: string
  货源类目: string
  产品主编号: string
  平台SKU: string
  SKU规格1: string
  SKU重量KG: number | null
  SKU售价: number | null
  SKU库存: number | null
  外箱毛重KG: number | null
}

// ── 导出请求 ─────────────────────────────────────────────────────────────

export interface ExportRequest {
  productIds: string[]
  options?: {
    currency?: string
    priceMarkup?: number
  }
}
