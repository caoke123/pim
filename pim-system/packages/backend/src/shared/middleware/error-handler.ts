/** shared/middleware/error-handler.ts — 全局错误处理中间件 */

import type { Context } from 'hono'
import { logger } from '../utils/logger'
import { AppError, ErrorCode } from '../utils/errors'

export function globalErrorHandler(err: Error, c: Context) {
  const requestId = c.get('requestId') || 'unknown'

  // AppError 系列 → 返回结构化错误
  if (err instanceof AppError) {
    logger.warn(
      { requestId, code: err.code, details: err.details },
      err.message,
    )

    return c.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
        requestId,
        timestamp: new Date().toISOString(),
      },
      err.status as any,
    )
  }

  // 未知错误 → 500
  logger.error({ requestId, err }, '未捕获的服务器错误')

  return c.json(
    {
      success: false,
      error: {
        code: ErrorCode.INTERNAL,
        message: '服务器内部错误',
      },
      requestId,
      timestamp: new Date().toISOString(),
    },
    500,
  )
}
