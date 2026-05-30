/** modules/products/products.schema.ts — Zod 校验 Schema */

import { z } from 'zod/v4'

// ── 产品列表查询 ──

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  keyword: z.string().optional(),
  status: z.enum(['pending', 'ready', 'active', 'archived']).optional(),
  platform: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'spuCode']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
})

export type ProductListQuerySchema = z.infer<typeof productListQuerySchema>

// ── 产品详情 (仅校验 UUID 格式) ──

export const productIdParamSchema = z.object({
  id: z.string().uuid('无效的产品 ID 格式'),
})

// ── 产品基础信息更新 ──

export const productBasicUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'ready', 'active', 'archived']).optional(),
  shopeeTitleEn: z.string().max(300).optional(),
  shopeeTitleZh: z.string().max(300).optional(),
  shopeeDescEn: z.string().optional(),
  shopeeDescZh: z.string().optional(),
  pimNotes: z.string().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: '请求体中至少需要包含一个有效字段' },
)

export type ProductBasicUpdateSchema = z.infer<typeof productBasicUpdateSchema>

// ── SKU 批量更新 ──

export const skuUpdateItemSchema = z.object({
  skuId: z.string().uuid('无效的 SKU ID 格式'),
  sellingPrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  weightG: z.number().min(0).optional(),
  size: z.string().optional(),
  sizeJson: z.object({ length: z.number(), width: z.number(), height: z.number(), unit: z.string() }).optional(),
  nameZhCustom: z.string().max(100).optional(),
  nameEnCustom: z.string().max(100).optional(),
})

export const skusUpdateSchema = z.object({
  skus: z.array(skuUpdateItemSchema).min(1, '至少需要一个 SKU').max(50, '单次最多更新 50 个 SKU'),
})

export type SkusUpdateSchema = z.infer<typeof skusUpdateSchema>
