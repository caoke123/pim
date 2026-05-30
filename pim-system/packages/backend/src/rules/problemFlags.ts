/** rules/problemFlags.ts — 产品问题标记规则配置 */

import type { ProblemFlags } from '../modules/products/products.dto'

interface FlagRule {
  key: keyof ProblemFlags
  label: string
  description: string
  priority: 'high' | 'medium' | 'low'
  evaluate: (context: FlagContext) => boolean
}

interface FlagContext {
  mainImageUrl: string | null
  description: string | null
  category: string | null
  spuCode: string | null
  skuPrices: (number | null)[]
  skuCount: number
  hasSkuMissingImage: boolean
}

export const PROBLEM_FLAG_RULES: FlagRule[] = [
  {
    key: 'missingMainImage',
    label: '缺少主图',
    description: '产品主图为空，无法在各平台展示',
    priority: 'high',
    evaluate: (ctx) => !ctx.mainImageUrl,
  },
  {
    key: 'missingPrice',
    label: '缺少价格',
    description: '所有 SKU 均未填写售价或售价为 0',
    priority: 'high',
    evaluate: (ctx) =>
      ctx.skuPrices.length === 0 || ctx.skuPrices.every((p) => p === null || p === 0),
  },
  {
    key: 'missingDescription',
    label: '缺少描述',
    description: '产品描述为空',
    priority: 'medium',
    evaluate: (ctx) => !ctx.description || ctx.description.trim() === '',
  },
  {
    key: 'missingCategory',
    label: '缺少类目',
    description: '产品类目未分类',
    priority: 'medium',
    evaluate: (ctx) => !ctx.category,
  },
  {
    key: 'missingSkuImage',
    label: 'SKU 缺图',
    description: '存在部分 SKU 缺少图片',
    priority: 'low',
    evaluate: (ctx) => ctx.skuCount > 0 && ctx.hasSkuMissingImage,
  },
  {
    key: 'hasNullSpuCode',
    label: 'SPU 编码异常',
    description: 'SPU 编码为空，数据完整性异常',
    priority: 'high',
    evaluate: (ctx) => !ctx.spuCode,
  },
]

/** 计算所有问题标记 */
export function evaluateProblemFlags(context: FlagContext): ProblemFlags {
  const flags: ProblemFlags = {
    missingMainImage: false,
    missingPrice: false,
    missingDescription: false,
    missingCategory: false,
    missingSkuImage: false,
    hasNullSpuCode: false,
  }

  for (const rule of PROBLEM_FLAG_RULES) {
    flags[rule.key] = rule.evaluate(context)
  }

  return flags
}

/** 获取当前产品存在的问题标记列表 */
export function getActiveProblems(flags: ProblemFlags): FlagRule[] {
  return PROBLEM_FLAG_RULES.filter((rule) => flags[rule.key])
}

/** 按优先级排序的问题标记 */
export function getProblemsByPriority(flags: ProblemFlags): FlagRule[] {
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  return getActiveProblems(flags).sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  )
}
