/** shared/utils/response.ts — 统一 API 响应工具 */

import type { Context } from 'hono'
import crypto from 'node:crypto'

// ── 统一响应格式 ──

export interface UnifiedResponse<T = unknown> {
  success: boolean
  data: T | null
  message: string
  requestId: string
  timestamp: string
}

// ── 分页响应 ──

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ── 成功响应构建器 ──

export function ok<T>(c: Context, data: T, message = 'ok', status = 200): Response {
  const body: UnifiedResponse<T> = {
    success: true,
    data,
    message,
    requestId: c.get('requestId') || 'unknown',
    timestamp: new Date().toISOString(),
  }
  return c.json(body, status as any)
}

export function okPaginated<T>(
  c: Context,
  items: T[],
  total: number,
  page: number,
  pageSize: number,
  message = 'ok',
): Response {
  const body: UnifiedResponse<PaginatedData<T>> = {
    success: true,
    data: {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    message,
    requestId: c.get('requestId') || 'unknown',
    timestamp: new Date().toISOString(),
  }
  return c.json(body, 200)
}

// ── 错误响应 ──

export function fail(c: Context, message: string, status = 400): Response {
  const body: UnifiedResponse<null> = {
    success: false,
    data: null,
    message,
    requestId: c.get('requestId') || 'unknown',
    timestamp: new Date().toISOString(),
  }
  return c.json(body, status as any)
}

export function notFound(c: Context, message = '资源不存在'): Response {
  return fail(c, message, 404)
}

export function serverError(c: Context, error: unknown): Response {
  const message = error instanceof Error ? error.message : '服务器内部错误'
  console.error('[ServerError]', error)
  return fail(c, message, 500)
}
